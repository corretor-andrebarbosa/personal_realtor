/**
 * Resgate das fotos dos imóveis hospedadas no ImgBB (i.ibb.co).
 *
 * Só LÊ: busca a lista de imóveis no banco de produção (chave pública) e
 * baixa cada foto do ImgBB para uma pasta de backup local. Não altera o site
 * nem o banco. Pode ser interrompido e reiniciado: o que já foi baixado fica.
 *
 * Uso:
 *   node tools/resgatar-fotos-imgbb.mjs                 # uma passada
 *   node tools/resgatar-fotos-imgbb.mjs --repetir=10    # repete a cada 10 min até baixar tudo
 *   node tools/resgatar-fotos-imgbb.mjs --pasta="D:/backup"
 *
 * Resultado: <pasta>/<id do imóvel>/<ordem>-<nome>.jpg e <pasta>/manifesto.json
 * (mapa: link antigo -> arquivo local, imóvel, campo, posição, tamanho).
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

const PASTA = path.resolve(args.pasta || path.join(os.homedir(), 'Pictures', 'corretor-Andre_Barbosa', 'backup-fotos-imgbb'));
const REPETIR_MIN = Number(args.repetir || 0);
const MANIFESTO = path.join(PASTA, 'manifesto.json');

function lerEnv() {
  const env = {};
  for (const f of ['.env', '.env.local']) {
    if (!fs.existsSync(f)) continue;
    for (const linha of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
      if (m) env[m[1]] = m[2];
    }
  }
  return { ...env, ...process.env };
}

const env = lerEnv();
const URL_BANCO = env.VITE_SUPABASE_URL;
const CHAVE = env.VITE_SUPABASE_ANON_KEY;

function listaDeFotos(valor) {
  if (!valor) return [];
  if (Array.isArray(valor)) return valor;
  const s = String(valor).trim();
  if (s.startsWith('[')) { try { return JSON.parse(s); } catch { /* segue */ } }
  return s.split(/[\s,]+/);
}

async function buscarImoveis() {
  if (!URL_BANCO || !CHAVE) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não encontrados no .env');
  const r = await fetch(`${URL_BANCO}/rest/v1/properties?select=id,title,image,images`, {
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` },
  });
  if (!r.ok) throw new Error(`Banco respondeu ${r.status}: ${await r.text()}`);
  return r.json();
}

function montarAlvos(imoveis) {
  const alvos = new Map(); // url -> { imovel, titulo, campo, posicao }
  for (const im of imoveis) {
    const add = (url, campo, pos) => {
      if (typeof url !== 'string' || !/^https?:\/\/i\.ibb\.co\//.test(url.trim())) return;
      url = url.trim();
      if (!alvos.has(url)) alvos.set(url, { imovel: im.id, titulo: im.title, campo, posicao: pos });
    };
    listaDeFotos(im.images).forEach((u, i) => add(u, 'images', i));
    add(im.image, 'image', 0);
  }
  return alvos;
}

function nomeArquivo(url, alvo) {
  const base = decodeURIComponent(url.split('/').pop()).replace(/[^\w.-]+/g, '_');
  return path.join(String(alvo.imovel), `${String(alvo.posicao + 1).padStart(2, '0')}-${base}`);
}

async function baixar(url, destino) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (backup André Barbosa Imóveis)' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const tipo = r.headers.get('content-type') || '';
    if (!tipo.startsWith('image/')) throw new Error('não é imagem: ' + tipo);
    const buf = Buffer.from(await r.arrayBuffer());
    const esperado = Number(r.headers.get('content-length') || 0);
    if (esperado && buf.length !== esperado) throw new Error(`incompleta ${buf.length}/${esperado}`);
    if (buf.length < 1024) throw new Error('arquivo pequeno demais');
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino + '.parcial', buf);
    fs.renameSync(destino + '.parcial', destino);
    return buf.length;
  } finally {
    clearTimeout(t);
  }
}

async function passada() {
  fs.mkdirSync(PASTA, { recursive: true });
  const manifesto = fs.existsSync(MANIFESTO) ? JSON.parse(fs.readFileSync(MANIFESTO, 'utf8')) : {};
  const imoveis = await buscarImoveis();
  const alvos = montarAlvos(imoveis);

  let novos = 0; let falhas = 0;
  const pendentes = [...alvos].filter(([url]) => !(manifesto[url] && fs.existsSync(path.join(PASTA, manifesto[url].arquivo))));
  console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ${imoveis.length} imóveis, ${alvos.size} fotos no ImgBB, ${alvos.size - pendentes.length} já salvas, ${pendentes.length} pendentes`);

  // 4 downloads em paralelo, com nova tentativa rápida em caso de falha
  let i = 0;
  async function trabalhador() {
    while (i < pendentes.length) {
      const [url, alvo] = pendentes[i++];
      const arquivo = nomeArquivo(url, alvo);
      let ok = false; let ultimoErro = '';
      for (let tentativa = 1; tentativa <= 3 && !ok; tentativa++) {
        try {
          const bytes = await baixar(url, path.join(PASTA, arquivo));
          manifesto[url] = { arquivo: arquivo.replace(/\\/g, '/'), ...alvo, bytes, salvoEm: new Date().toISOString() };
          ok = true; novos++;
        } catch (e) {
          ultimoErro = e.message;
          await new Promise((r) => setTimeout(r, 1500 * tentativa));
        }
      }
      if (!ok) falhas++;
      if (ok) process.stdout.write('.'); else process.stdout.write('x');
      if (ok && !ultimoErro) { /* sem erro */ }
    }
  }
  await Promise.all([trabalhador(), trabalhador(), trabalhador(), trabalhador()]);
  fs.writeFileSync(MANIFESTO, JSON.stringify(manifesto, null, 2));

  const total = Object.keys(manifesto).filter((u) => alvos.has(u)).length;
  console.log(`\n  +${novos} novas nesta passada, ${falhas} ainda falhando. Total salvo: ${total}/${alvos.size}. Pasta: ${PASTA}`);

  // relatório por imóvel
  const porImovel = {};
  for (const [url, alvo] of alvos) {
    const k = alvo.imovel;
    porImovel[k] = porImovel[k] || { titulo: alvo.titulo, total: 0, salvas: 0 };
    porImovel[k].total++;
    if (manifesto[url]) porImovel[k].salvas++;
  }
  fs.writeFileSync(path.join(PASTA, 'relatorio.txt'),
    Object.entries(porImovel).map(([id, v]) => `${v.salvas === v.total ? 'OK ' : '...'} imóvel ${id}: ${v.salvas}/${v.total}  ${v.titulo}`).join('\n') + '\n');
  return { total, alvos: alvos.size };
}

async function main() {
  for (;;) {
    let r;
    try { r = await passada(); } catch (e) { console.error('Erro na passada:', e.message); }
    if (r && r.total >= r.alvos) { console.log('Todas as fotos foram salvas.'); break; }
    if (!REPETIR_MIN) break;
    console.log(`  próxima tentativa em ${REPETIR_MIN} min (Ctrl+C para parar)`);
    await new Promise((res) => setTimeout(res, REPETIR_MIN * 60000));
  }
}

main();
