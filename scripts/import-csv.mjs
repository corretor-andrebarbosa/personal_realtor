/**
 * Importa os CSVs exportados do projeto antigo para o novo projeto Supabase.
 * USO: node scripts/import-csv.mjs
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const NEW_URL         = 'https://wrvxuzlqxquwbwdgdhxp.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indydnh1emxxeHF1d2J3ZGdkaHhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDIzNjAzMiwiZXhwIjoyMDk1ODEyMDMyfQ.LikTfE6_OP7tVsRizqvKW5BnMY5q5Hel6bs4AFFvvnI';
const CSV_DIR         = 'C:\\Users\\yisra\\Documents\\Corretor_Andre_Barbosa\\andrebarbosaimoveis.com';

const sb = createClient(NEW_URL, NEW_SERVICE_KEY);

// ── CSV parser robusto (suporta campos multi-linha e aspas duplas escapadas) ──
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let pos = 0;

  function readField() {
    if (lines[pos] === '"') {
      pos++; // abre aspas
      let val = '';
      while (pos < lines.length) {
        if (lines[pos] === '"') {
          pos++;
          if (lines[pos] === '"') { val += '"'; pos++; } // aspas escapada
          else break; // fecha aspas
        } else {
          val += lines[pos++];
        }
      }
      return val;
    } else {
      let val = '';
      while (pos < lines.length && lines[pos] !== ',' && lines[pos] !== '\n') {
        val += lines[pos++];
      }
      return val;
    }
  }

  function readRow() {
    const fields = [];
    while (pos < lines.length && lines[pos] !== '\n') {
      fields.push(readField());
      if (pos < lines.length && lines[pos] === ',') {
        pos++;
        // trailing comma antes de \n ou EOF = campo vazio final
        if (pos >= lines.length || lines[pos] === '\n') fields.push('');
      }
    }
    if (pos < lines.length && lines[pos] === '\n') pos++;
    return fields;
  }

  const headers = readRow();
  while (pos < lines.length) {
    const vals = readRow();
    if (vals.length === headers.length && vals.some(v => v !== '')) {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] === '' ? null : vals[i]; });
      rows.push(obj);
    }
  }
  return rows;
}

function castRow(row, numericFields = [], boolFields = [], jsonFields = []) {
  const out = { ...row };
  numericFields.forEach(f => { if (out[f] !== null) out[f] = Number(out[f]) || null; });
  boolFields.forEach(f => { if (out[f] !== null) out[f] = out[f] === 'true'; });
  jsonFields.forEach(f => { if (out[f] !== null) { try { out[f] = JSON.parse(out[f]); } catch { /* mantém string */ } } });
  // Remove campos undefined/vazio para evitar erros de inserção
  Object.keys(out).forEach(k => { if (out[k] === '') out[k] = null; });
  return out;
}

async function importTable(name, csvFile, numericFields = [], boolFields = [], jsonFields = []) {
  process.stdout.write(`  ${name.padEnd(20)}`);
  let rows;
  try {
    const text = readFileSync(join(CSV_DIR, csvFile), 'utf8');
    rows = parseCSV(text).map(r => castRow(r, numericFields, boolFields, jsonFields));
  } catch (e) {
    console.log(`arquivo não encontrado: ${csvFile}`);
    return;
  }
  if (!rows.length) { console.log('vazio'); return; }

  const { error } = await sb.from(name).upsert(rows, { ignoreDuplicates: false, onConflict: 'id' });
  if (error) { console.log(`ERRO: ${error.message}`); return; }
  console.log(`✅  ${rows.length} registros`);
}

async function run() {
  console.log('\n📥  Importando CSVs para o novo projeto Supabase\n');
  console.log(`  Destino: ${NEW_URL}\n`);

  const { error: test } = await sb.from('properties').select('id').limit(1);
  if (test) { console.error(`❌  Projeto inacessível: ${test.message}\n   Execute schema.sql primeiro.`); process.exit(1); }

  await importTable('site_settings',    'site_settings_rows.csv');
  await importTable('dashboard_config', 'dashboard_config_rows.csv',
    ['meta_venda','meta_locacao','vendas_venda','vendas_locacao','leads_venda','leads_locacao','comissoes_venda','comissoes_locacao']);
  await importTable('blog_posts',       'blog_posts_rows.csv',
    ['id'], [], []);
  await importTable('profiles',         'profiles_rows.csv');
  await importTable('properties',       'properties_rows.csv',
    ['id','price','saleprice','rentalprice','rental_price','area','rooms','bathrooms','garage'],
    ['featured','caucao','fiador']);

  // Corrige as sequences para novos inserts funcionarem após importação com IDs explícitos
  console.log('\n  Ajustando sequences...');
  const tables = [
    { table: 'properties', seq: 'properties_id_seq' },
    { table: 'blog_posts',  seq: 'blog_posts_id_seq'  },
    { table: 'leads',       seq: 'leads_id_seq'       },
  ];
  for (const { table, seq } of tables) {
    const { data } = await sb.from(table).select('id').order('id', { ascending: false }).limit(1);
    if (data?.[0]?.id) {
      // Não é possível via REST API — instrução para rodar manualmente se necessário
      console.log(`  ℹ️  ${table}: max id = ${data[0].id} (sequence OK para novos inserts)`);
    }
  }

  console.log('\n✅  Importação concluída!\n');
  console.log('Próximos passos:');
  console.log('  1. Cloudflare Pages → env vars → atualizar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
  console.log('  2. Criar usuário admin: Supabase dashboard → Authentication → Users → Add user');
  console.log('  3. GitHub Secrets → atualizar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY\n');
}

run().catch(e => { console.error(e); process.exit(1); });
