#!/usr/bin/env node
/**
 * Deploy completo do Buscador Inteligente:
 *   1. Verifica auth Cloudflare (pede login se necessário)
 *   2. Publica o Cloudflare Worker
 *   3. Seta os 3 secrets no Cloudflare
 *   4. Merge feat/busca-inteligente → main + push
 *
 * Uso: node scripts/deploy-busca.mjs
 */

import { spawnSync, execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT       = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORKER_DIR = join(ROOT, 'workers', 'busca-imoveis');
const VARS_PATH  = join(WORKER_DIR, '.dev.vars');

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD   = '\x1b[1m';
const CYAN   = '\x1b[36m';

const ok   = (m) => console.log(`${GREEN}✓${RESET} ${m}`);
const fail = (m) => console.log(`${RED}✗${RESET} ${m}`);
const info = (m) => console.log(`${YELLOW}→${RESET} ${m}`);
const step = (m) => console.log(`\n${CYAN}${BOLD}${m}${RESET}`);

// ── Helpers ──────────────────────────────────────────────────────────────────

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', ...opts });
}

function readVars() {
  if (!existsSync(VARS_PATH)) return {};
  return Object.fromEntries(
    readFileSync(VARS_PATH, 'utf-8')
      .split('\n')
      .filter(l => l.includes('='))
      .map(l => l.split('=').map(s => s.trim()))
      .map(([k, ...v]) => [k, v.join('=')])
  );
}

// ── 1. Verifica auth Cloudflare ───────────────────────────────────────────────

step('1/4  Verificando autenticação Cloudflare...');

const whoami = run('npx', ['wrangler', 'whoami'], { cwd: WORKER_DIR, stdio: ['ignore', 'pipe', 'pipe'] });
const whoamiOut = (whoami.stdout || '') + (whoami.stderr || '');
const notAuth = whoami.status !== 0 || whoamiOut.toLowerCase().includes('not authenticated');

if (notAuth) {
  fail('Não autenticado no Cloudflare.');
  info('Execute o comando abaixo, aguarde o browser abrir, autorize e volte aqui:');
  console.log(`\n  cd workers/busca-imoveis\n  npx wrangler login\n`);
  info('Depois rode novamente: node scripts/deploy-busca.mjs');
  process.exit(1);
}

const emailMatch = whoamiOut.match(/email\s+([^\s,]+)/i) || whoamiOut.match(/ci\.[\w.]+@[\w.]+/i);
ok(`Autenticado${emailMatch ? ' como: ' + emailMatch[0].trim() : ''}`);

// ── 2. Publica o Worker ───────────────────────────────────────────────────────

step('2/4  Publicando Cloudflare Worker...');

const deploy = run('npx', ['wrangler', 'deploy'], {
  cwd: WORKER_DIR,
  stdio: ['ignore', 'pipe', 'pipe'],
});

const deployOut = (deploy.stdout || '') + (deploy.stderr || '');
console.log(deployOut.trim());

if (deploy.status !== 0) {
  fail('Deploy falhou. Verifique o erro acima.');
  process.exit(1);
}

// Extrai a URL do worker do output
const urlMatch = deployOut.match(/https:\/\/[\w-]+\.[\w-]+\.workers\.dev/);
const workerUrl = urlMatch ? urlMatch[0] : null;

if (workerUrl) {
  ok(`Worker publicado em: ${workerUrl}`);
} else {
  ok('Worker publicado (URL via rota: https://andrebarbosaimoveis.com/api/busca-imoveis)');
}

// ── 3. Seta os secrets ────────────────────────────────────────────────────────

step('3/4  Configurando secrets no Cloudflare...');

const vars = readVars();
const SECRETS = ['GROQ_API_KEY', 'SERPER_API_KEY', 'SUPABASE_SERVICE_KEY'];

for (const key of SECRETS) {
  const value = vars[key];
  if (!value || value.startsWith('COLE_')) {
    fail(`${key} não preenchida em .dev.vars — pulando.`);
    continue;
  }

  const result = run('npx', ['wrangler', 'secret', 'put', key], {
    input: value + '\n',
    cwd: WORKER_DIR,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (result.status === 0) {
    ok(`${key} configurada`);
  } else {
    fail(`Erro ao setar ${key}: ${(result.stderr || '').slice(0, 200)}`);
  }
}

// ── 4. Merge + Push ───────────────────────────────────────────────────────────

step('4/4  Fazendo merge para main e push...');

try {
  // Garante que tudo está commitado na branch atual
  const status = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' }).trim();
  if (status) {
    info('Há mudanças não commitadas. Commitando...');
    execSync('git add .', { cwd: ROOT, stdio: 'inherit' });
    execSync(
      'git commit -m "feat: Buscador inteligente com busca real (Serper + Groq)"',
      { cwd: ROOT, stdio: 'inherit' }
    );
  } else {
    info('Nada para commitar na branch atual.');
  }

  // Vai para main e faz merge
  execSync('git checkout main', { cwd: ROOT, stdio: 'inherit' });
  execSync('git merge feat/busca-inteligente --no-ff -m "feat: merge buscador inteligente → main"',
    { cwd: ROOT, stdio: 'inherit' });
  execSync('git push origin main', { cwd: ROOT, stdio: 'inherit' });

  ok('Merge e push concluídos!');
} catch (e) {
  fail(`Erro no git: ${e.message}`);
  info('Resolva os conflitos manualmente e rode "git push origin main".');
  process.exit(1);
}

// ── Resumo ────────────────────────────────────────────────────────────────────

console.log(`
${GREEN}${BOLD}══════════════════════════════════════════${RESET}
${GREEN}${BOLD}  Deploy concluído com sucesso!${RESET}
${GREEN}${BOLD}══════════════════════════════════════════${RESET}

  Worker:   ${workerUrl || 'https://andrebarbosaimoveis.com/api/busca-imoveis'}
  Frontend: https://andrebarbosaimoveis.com

  O Cloudflare Pages vai rebuildar automaticamente.
  Em ~2 minutos o buscador estará disponível em produção.
`);
