/**
 * Migração completa de dados entre projetos Supabase.
 *
 * USO:
 *   1. Crie o novo projeto Supabase em https://supabase.com
 *   2. No novo projeto, abra o SQL Editor e execute scripts/schema.sql
 *   3. Preencha as variáveis abaixo (OLD_ = projeto atual, NEW_ = novo projeto)
 *   4. node scripts/migrate-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';

// ── Credenciais do projeto ANTIGO (com problema) ─────────────────────────────
const OLD_URL         = 'https://kavjusgxohdpvkeknyjz.supabase.co';
const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthdmp1c2d4b2hkcHZrZWtueWp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4MjEzMiwiZXhwIjoyMDg2OTU4MTMyfQ.-XAYNhjs2isacKKjmW1I0_c-RIG3UdNt6eOBFkCkin4';

// ── Credenciais do projeto NOVO ───────────────────────────────────────────────
const NEW_URL         = process.env.NEW_SUPABASE_URL         || '';
const NEW_SERVICE_KEY = process.env.NEW_SUPABASE_SERVICE_KEY || '';

// ── Tabelas a migrar (ordem importa para FK) ──────────────────────────────────
const TABLES = ['site_settings', 'blog_posts', 'leads', 'people', 'properties', 'whatsapp_matches'];

// ─────────────────────────────────────────────────────────────────────────────

if (!NEW_URL || !NEW_SERVICE_KEY) {
  console.error('\n❌ Defina as variáveis de ambiente antes de rodar:');
  console.error('   NEW_SUPABASE_URL=https://... NEW_SUPABASE_SERVICE_KEY=eyJ... node scripts/migrate-supabase.mjs\n');
  process.exit(1);
}

const src = createClient(OLD_URL, OLD_SERVICE_KEY);
const dst = createClient(NEW_URL, NEW_SERVICE_KEY);

async function migrateTable(table) {
  process.stdout.write(`  ${table.padEnd(20)} `);

  // Lê todos os registros (paginado)
  const PAGE = 1000;
  let allRows = [], from = 0;
  while (true) {
    const { data, error } = await src.from(table).select('*').range(from, from + PAGE - 1);
    if (error) { console.log(`ERRO leitura: ${error.message}`); return; }
    if (!data?.length) break;
    allRows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  if (!allRows.length) { console.log('vazio — ignorado'); return; }

  // Insere no novo projeto em lotes (upsert para evitar duplicatas se rodar 2x)
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < allRows.length; i += BATCH) {
    const batch = allRows.slice(i, i + BATCH);
    const { error } = await dst.from(table).upsert(batch, { ignoreDuplicates: true });
    if (error) { console.log(`\n   ERRO inserção lote ${i}: ${error.message}`); return; }
    inserted += batch.length;
  }

  console.log(`✅  ${inserted} registros migrados`);
}

async function run() {
  console.log('\n🔄 Iniciando migração Supabase\n');
  console.log(`  Origem : ${OLD_URL}`);
  console.log(`  Destino: ${NEW_URL}\n`);

  // Verifica conectividade
  const { error: testOld } = await src.from('properties').select('id').limit(1);
  if (testOld) { console.error(`❌ Não foi possível conectar ao projeto ANTIGO: ${testOld.message}`); process.exit(1); }

  const { error: testNew } = await dst.from('properties').select('id').limit(1);
  if (testNew) { console.error(`❌ Não foi possível conectar ao projeto NOVO: ${testNew.message}\n   Execute o schema.sql no novo projeto antes.`); process.exit(1); }

  for (const table of TABLES) {
    await migrateTable(table);
  }

  console.log('\n✅ Migração concluída!\n');
  console.log('Próximos passos:');
  console.log('  1. Atualize VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Cloudflare Pages');
  console.log('  2. Atualize VITE_SUPABASE_ANON_KEY nos secrets do GitHub (para o keep-alive)');
  console.log('  3. Atualize workers/whatsapp-monitor/.env com as novas credenciais\n');
}

run().catch(err => { console.error(err); process.exit(1); });
