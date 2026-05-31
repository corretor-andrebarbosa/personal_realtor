/**
 * Migração completa: banco de dados + Storage (fotos) entre projetos Supabase.
 *
 * USO:
 *   NEW_SUPABASE_URL=https://xxx.supabase.co NEW_SUPABASE_SERVICE_KEY=eyJ... node scripts/migrate-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';

const OLD_URL         = 'https://kavjusgxohdpvkeknyjz.supabase.co';
const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthdmp1c2d4b2hkcHZrZWtueWp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4MjEzMiwiZXhwIjoyMDg2OTU4MTMyfQ.-XAYNhjs2isacKKjmW1I0_c-RIG3UdNt6eOBFkCkin4';
const NEW_URL         = process.env.NEW_SUPABASE_URL         || '';
const NEW_SERVICE_KEY = process.env.NEW_SUPABASE_SERVICE_KEY || '';

const TABLES = ['site_settings', 'blog_posts', 'leads', 'people', 'properties', 'whatsapp_matches'];

if (!NEW_URL || !NEW_SERVICE_KEY) {
  console.error('\n❌  Defina as variáveis antes de rodar:');
  console.error('    NEW_SUPABASE_URL=https://... NEW_SUPABASE_SERVICE_KEY=eyJ... node scripts/migrate-supabase.mjs\n');
  process.exit(1);
}

const src = createClient(OLD_URL, OLD_SERVICE_KEY);
const dst = createClient(NEW_URL, NEW_SERVICE_KEY);

// ── Banco de dados ─────────────────────────────────────────────────────────

async function migrateTable(table) {
  process.stdout.write(`  ${table.padEnd(22)}`);
  let rows = [], from = 0;
  while (true) {
    const { data, error } = await src.from(table).select('*').range(from, from + 999);
    if (error) { console.log(`ERRO: ${error.message}`); return 0; }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  if (!rows.length) { console.log('vazio'); return 0; }
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await dst.from(table).upsert(rows.slice(i, i + 200), { ignoreDuplicates: true });
    if (error) { console.log(`ERRO: ${error.message}`); return 0; }
  }
  console.log(`✅  ${rows.length} registros`);
  return rows.length;
}

// ── Storage (fotos) ────────────────────────────────────────────────────────

async function listAllFiles(client, bucket, prefix = '') {
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data) return [];
  const files = [];
  for (const item of data) {
    if (item.id) {
      files.push(prefix ? `${prefix}/${item.name}` : item.name);
    } else {
      // pasta — recursivo
      const sub = await listAllFiles(client, bucket, prefix ? `${prefix}/${item.name}` : item.name);
      files.push(...sub);
    }
  }
  return files;
}

async function migrateStorage() {
  console.log('\n📦  Migrando Storage (fotos)...\n');
  const { data: buckets, error } = await src.storage.listBuckets();
  if (error) { console.log(`  ERRO ao listar buckets: ${error.message}`); return; }
  if (!buckets?.length) { console.log('  Nenhum bucket encontrado.'); return; }

  for (const bucket of buckets) {
    console.log(`  Bucket: ${bucket.id} (${bucket.public ? 'público' : 'privado'})`);

    // Cria bucket no novo projeto
    await dst.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.file_size_limit,
      allowedMimeTypes: bucket.allowed_mime_types,
    }).catch(() => { /* já existe */ });

    const files = await listAllFiles(src, bucket.id);
    console.log(`    ${files.length} arquivo(s) encontrado(s)`);

    let ok = 0, fail = 0;
    for (const path of files) {
      const { data: blob, error: dlErr } = await src.storage.from(bucket.id).download(path);
      if (dlErr) { fail++; continue; }
      const buf = Buffer.from(await blob.arrayBuffer());
      const { error: upErr } = await dst.storage.from(bucket.id).upload(path, buf, { upsert: true });
      upErr ? fail++ : ok++;
      process.stdout.write(`\r    copiados: ${ok}  falhas: ${fail}   `);
    }
    console.log(`\n    ✅  ${ok} copiados, ${fail} falhas`);
  }

  // Atualiza as URLs nas tabelas para apontar para o novo projeto
  console.log('\n  Atualizando URLs nas tabelas...');
  const { data: props } = await dst.from('properties').select('id, image, image_url, main_image, images, gallery');
  if (props?.length) {
    for (const p of props) {
      const fix = (v) => typeof v === 'string' ? v.replace(OLD_URL, NEW_URL) : v;
      const fixArr = (v) => Array.isArray(v) ? v.map(fix) : v;
      await dst.from('properties').update({
        image:      fix(p.image),
        image_url:  fix(p.image_url),
        main_image: fix(p.main_image),
        images:     fixArr(p.images),
        gallery:    fixArr(p.gallery),
      }).eq('id', p.id);
    }
    console.log(`  ✅  URLs de ${props.length} imóveis atualizadas`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🔄  Migração Supabase\n');
  console.log(`  Origem : ${OLD_URL}`);
  console.log(`  Destino: ${NEW_URL}\n`);

  const { error: e1 } = await src.from('properties').select('id').limit(1);
  if (e1) { console.error(`❌  Projeto antigo inacessível: ${e1.message}`); process.exit(1); }

  const { error: e2 } = await dst.from('properties').select('id').limit(1);
  if (e2) { console.error(`❌  Projeto novo inacessível: ${e2.message}\n   Execute o schema.sql primeiro.`); process.exit(1); }

  console.log('📋  Tabelas:\n');
  for (const t of TABLES) await migrateTable(t);

  await migrateStorage();

  console.log('\n✅  Migração concluída!\n');
  console.log('Agora atualize (copie/cole o NEW_URL e NEW_ANON):');
  console.log('  • Cloudflare Pages → env vars');
  console.log('  • GitHub Secrets');
  console.log('  • workers/whatsapp-monitor/.env\n');
}

run().catch(e => { console.error(e); process.exit(1); });
