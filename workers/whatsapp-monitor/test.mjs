/**
 * Testa matching + notificação Telegram sem precisar do WhatsApp.
 * USO: node test.mjs
 */
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

import { extractIntent, findMatches } from './lib/matcher.mjs';
import { saveMatch, sendTelegram } from './lib/notifier.mjs';

const MENSAGENS_TESTE = [
  'Tenho cliente procurando apartamento 2 quartos no Bessa até 500 mil, alguém tem?',
  'Bom dia! Cliente interessado em terreno em condomínio fechado na região de João Pessoa',
  'Alguém tem casa ou sítio disponível para venda no interior da PB?',
];

console.log('\n🧪 Teste de matching e notificação Telegram\n');

for (const msg of MENSAGENS_TESTE) {
  console.log(`\n💬 Mensagem: "${msg}"`);

  const intent = await extractIntent(msg);
  console.log(`   Intenção detectada: is_search=${intent.is_property_search}, tipo=${intent.type}, bairros=${JSON.stringify(intent.neighborhoods)}, preço_max=${intent.max_price}`);

  if (!intent.is_property_search) {
    console.log('   → não detectado como busca de imóvel');
    continue;
  }

  const properties = await findMatches(intent);
  console.log(`   → ${properties.length} imóvel(is) compatível(is): ${properties.map(p => p.title?.slice(0, 40)).join(' | ')}`);

  if (properties.length > 0) {
    const payload = {
      senderName:  'Corretor Teste',
      senderPhone: '5583999999999',
      groupName:   'Grupo Teste',
      message:     msg,
      intent,
      properties,
    };
    await saveMatch(payload);
    await sendTelegram(payload);
    console.log('   ✅ Match salvo no Supabase + notificação enviada ao Telegram');
  }
}

console.log('\n✅ Teste concluído. Verifique:\n  • Telegram: chegou a notificação?\n  • Plataforma (/admin): apareceu na seção "Matches WhatsApp"?\n');
process.exit(0);
