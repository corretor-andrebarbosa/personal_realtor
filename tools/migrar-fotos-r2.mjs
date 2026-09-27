/**
 * Migra as fotos resgatadas do ImgBB para o Cloudflare R2 e gera o SQL
 * que troca os links no banco (com SQL de reversão).
 *
 * Pré-requisitos:
 *   1. R2 ativado no painel da Cloudflare.
 *   2. Fotos já baixadas por tools/resgatar-fotos-imgbb.mjs (manifesto.json).
 *   3. Domínio público do bucket conectado (ex.: https://fotos.andrebarbosaimoveis.com).
 *
 * Uso:
 *   node tools/migrar-fotos-r2.mjs --criar-bucket
 *   node tools/migrar-fotos-r2.mjs --base=https://fotos.andrebarbosaimoveis.com
 *
 * Pode rodar quantas vezes quiser: envia só o que falta e confere cada link
 * novo antes de colocá-lo no SQL. NÃO altera o banco: gera
 *   <pasta>/sql/1-backup.sql, 2-trocar-links.sql, 3-reverter-links.sql
 * para colar no editor SQL do Supabase.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : true];
}));

const PASTA = path.resolve(args.pasta || path.join(os.homedir(), 'Pictures', 'corretor-Andre_Barbosa', 'backup-fotos-imgbb'));
const BUCKET = args.bucket || 'fotos-imoveis';
const BASE = String(args.base || '').replace(/\/+$/, '');
const ENVIADAS = path.join(PASTA, 'r2-enviadas.json');

function wrangler(argsW) {
  const r = spawnSync('npx', ['wrangler', ...argsW], { encoding: 'utf8', shell: process.platform === 'win32' });
  return { ok: r.status === 0, saida: (r.stdout || '') + (r.stderr || '') };
}

const tipoPorExt = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const sqlTexto = (s) => "'" + String(s).replace(/'/g, "''") + "'";

if (args['criar-bucket']) {
  const r = wrangler(['r2', 'bucket', 'create', BUCKET]);
  console.log(r.ok ? `Bucket "${BUCKET}" criado.` : r.saida.includes('already exists') ? `Bucket "${BUCKET}" já existe.` : r.saida);
  process.exit(0);
}

if (!BASE.startsWith('https://')) {
  console.error('Informe o endereço público do bucket: --base=https://fotos.andrebarbosaimoveis.com');
  process.exit(1);
}

const manifesto = JSON.parse(fs.readFileSync(path.join(PASTA, 'manifesto.json'), 'utf8'));
const enviadas = fs.existsSync(ENVIADAS) ? JSON.parse(fs.readFileSync(ENVIADAS, 'utf8')) : {};

// 1) envia ao R2 o que falta
const pendentes = Object.entries(manifesto).filter(([url]) => !enviadas[url]);
console.log(`${Object.keys(manifesto).length} fotos no backup, ${Object.keys(enviadas).length} já no R2, ${pendentes.length} para enviar`);
for (const [url, item] of pendentes) {
  const arquivo = path.join(PASTA, item.arquivo);
  if (!fs.existsSync(arquivo)) continue;
  const chave = item.arquivo.replace(/\\/g, '/');
  const tipo = tipoPorExt[path.extname(arquivo).toLowerCase()] || 'application/octet-stream';
  const r = wrangler(['r2', 'object', 'put', `${BUCKET}/${chave}`, `--file=${arquivo}`, `--content-type=${tipo}`,
    '--cache-control=public,max-age=31536000,immutable', '--remote']);
  if (r.ok) {
    enviadas[url] = { chave, novoLink: `${BASE}/${chave}` };
    fs.writeFileSync(ENVIADAS, JSON.stringify(enviadas, null, 2));
    process.stdout.write('.');
  } else {
    process.stdout.write('x');
    if (/enable R2|10042/.test(r.saida)) { console.error('\nR2 não está ativado na conta. Ative no painel e rode de novo.'); process.exit(1); }
  }
}
console.log('');

// 2) confere se cada link novo abre de verdade antes de usá-lo
const conferidas = [];
for (const [url, e] of Object.entries(enviadas)) {
  e.novoLink = `${BASE}/${e.chave}`;
  try {
    const r = await fetch(e.novoLink, { method: 'HEAD' });
    if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) conferidas.push([url, e.novoLink]);
    else console.log('não abriu ainda:', e.novoLink, r.status);
  } catch (err) {
    console.log('não abriu ainda:', e.novoLink, err.message);
  }
}
console.log(`${conferidas.length} links novos conferidos e prontos para troca`);

// 3) SQL (não é executado aqui)
const dirSql = path.join(PASTA, 'sql');
fs.mkdirSync(dirSql, { recursive: true });
const tabelaBackup = 'properties_backup_fotos_' + new Date().toISOString().slice(0, 10).replace(/-/g, '');
fs.writeFileSync(path.join(dirSql, '1-backup.sql'),
  `-- Cópia de segurança dos campos de foto antes da troca\ncreate table if not exists ${tabelaBackup} as\n  select id, image, images, now() as copiado_em from properties;\nalter table ${tabelaBackup} enable row level security;\n`);

const trocar = (de, para) =>
  `update properties set image = replace(image, ${sqlTexto(de)}, ${sqlTexto(para)}), images = replace(images, ${sqlTexto(de)}, ${sqlTexto(para)})\n  where image like ${sqlTexto('%' + de + '%')} or images like ${sqlTexto('%' + de + '%')};`;
fs.writeFileSync(path.join(dirSql, '2-trocar-links.sql'),
  `-- Troca ${conferidas.length} links do ImgBB pelos do R2\nbegin;\n${conferidas.map(([de, para]) => trocar(de, para)).join('\n')}\ncommit;\n`);
fs.writeFileSync(path.join(dirSql, '3-reverter-links.sql'),
  `-- Desfaz a troca (volta para os links do ImgBB)\nbegin;\n${conferidas.map(([de, para]) => trocar(para, de)).join('\n')}\ncommit;\n`);
console.log('SQL gerado em', dirSql);
