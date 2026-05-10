#!/usr/bin/env node
/**
 * Verifica .dev.vars e testa as chaves Groq + Serper.
 * Uso: node setup.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const DIR = dirname(fileURLToPath(import.meta.url));
const VARS_PATH = join(DIR, '.dev.vars');

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';

function ok(msg) { console.log(`${GREEN}✓${RESET} ${msg}`); }
function fail(msg) { console.log(`${RED}✗${RESET} ${msg}`); }
function info(msg) { console.log(`${YELLOW}→${RESET} ${msg}`); }

if (!existsSync(VARS_PATH)) {
  fail('.dev.vars não encontrado');
  process.exit(1);
}

const vars = Object.fromEntries(
  readFileSync(VARS_PATH, 'utf-8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim()))
    .map(([k, ...v]) => [k, v.join('=')])
);

const PLACEHOLDERS = ['COLE_SUA_CHAVE_GROQ_AQUI', 'COLE_SUA_CHAVE_SERPER_AQUI', 'COLE_SUA_SERVICE_ROLE_KEY_AQUI', ''];
let allOk = true;

function checkVar(key, hint) {
  if (!vars[key] || PLACEHOLDERS.includes(vars[key])) {
    fail(`${key} não preenchida`);
    info(hint);
    allOk = false;
  } else {
    ok(`${key} definida (${vars[key].slice(0, 8)}...)`);
  }
}

checkVar('GROQ_API_KEY', 'Obtenha grátis em: https://console.groq.com/keys');
checkVar('SERPER_API_KEY', 'Obtenha grátis em: https://serper.dev  (2500 buscas/mês)');
checkVar('SUPABASE_SERVICE_KEY', 'Supabase Dashboard → Settings → API → service_role');

if (!allOk) process.exit(1);

// Testa Groq
console.log(`\n${BOLD}Testando Groq...${RESET}`);
const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vars.GROQ_API_KEY}` },
  body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: 'ok' }], max_tokens: 5 }),
}).catch(e => { fail(e.message); process.exit(1); });

if (groqRes.ok) ok('Groq OK');
else { fail(`Groq ${groqRes.status}`); process.exit(1); }

// Testa Serper
console.log(`\n${BOLD}Testando Serper...${RESET}`);
const serperRes = await fetch('https://google.serper.dev/search', {
  method: 'POST',
  headers: { 'X-API-KEY': vars.SERPER_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ q: 'apartamento João Pessoa', gl: 'br', num: 1 }),
}).catch(e => { fail(e.message); process.exit(1); });

if (serperRes.ok) {
  const data = await serperRes.json();
  ok(`Serper OK — ${data.organic?.length ?? 0} resultado(s) de teste`);
} else {
  const body = await serperRes.json().catch(() => ({}));
  fail(`Serper ${serperRes.status}: ${body?.message ?? JSON.stringify(body)}`);
  process.exit(1);
}

console.log(`\n${GREEN}${BOLD}Tudo pronto!${RESET} Execute:\n\n  npm run dev:full\n`);
