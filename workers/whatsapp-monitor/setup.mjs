// Cria a tabela whatsapp_matches no Supabase
// Execute UMA VEZ: npm run setup

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const envPath = join(dirname(fileURLToPath(import.meta.url)), '.env');
try {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...rest] = line.split('=');
    if (k && !k.startsWith('#') && rest.length) {
      const v = rest.join('=').trim();
      if (v) process.env[k.trim()] = v;
    }
  });
} catch { /* ignora */ }

const SQL = `
CREATE TABLE IF NOT EXISTS whatsapp_matches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz DEFAULT now(),
  sender_name         text,
  sender_phone        text,
  group_name          text,
  message             text,
  intent              jsonb,
  matched_properties  jsonb,
  read                boolean DEFAULT false
);

ALTER TABLE whatsapp_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service full access" ON whatsapp_matches;
CREATE POLICY "service full access" ON whatsapp_matches
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated read" ON whatsapp_matches;
CREATE POLICY "authenticated read" ON whatsapp_matches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
`;

// Supabase não expõe DDL via JS client — exibe o SQL para rodar no painel
console.log('\n📋 Execute o SQL abaixo no Supabase Dashboard → SQL Editor:\n');
console.log('─'.repeat(60));
console.log(SQL.trim());
console.log('─'.repeat(60));
console.log('\n🔗 https://supabase.com/dashboard/project/kavjusgxohdpvkeknyjz/sql/new\n');

// Verifica se a tabela já existe
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const { error } = await supabase.from('whatsapp_matches').select('id').limit(1);
if (!error) {
  console.log('✅ Tabela whatsapp_matches já existe e está acessível.\n');
} else {
  console.log('⚠️  Tabela ainda não existe. Rode o SQL acima primeiro.\n');
}
