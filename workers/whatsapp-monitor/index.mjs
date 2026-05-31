import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Carrega .env manualmente (sem dependência extra)
const envPath = join(dirname(fileURLToPath(import.meta.url)), '.env');
try {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...rest] = line.split('=');
    if (k && !k.startsWith('#') && rest.length) {
      const v = rest.join('=').trim();
      if (v) process.env[k.trim()] = v;
    }
  });
} catch { /* .env ausente — usa variáveis de ambiente do sistema */ }

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

import { isWorkingNow, msUntilNextTransition } from './lib/calendar.mjs';
import { extractIntent, findMatches } from './lib/matcher.mjs';
import { saveMatch, sendTelegram } from './lib/notifier.mjs';

// Grupos a monitorar: IDs completos (@g.us) ou substring do nome
const GROUPS_RAW = (process.env.WA_GROUPS || '').split(',').map(s => s.trim()).filter(Boolean);

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
});

client.on('qr', qr => {
  console.log('\n📱 Escaneie o QR code com o WhatsApp:\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => console.log('✅ WhatsApp autenticado'));
client.on('ready',         () => console.log('✅ WhatsApp pronto — monitorando grupos'));
client.on('disconnected',  r  => console.warn('⚠️  WhatsApp desconectado:', r));

async function isMonitored(msg) {
  if (!msg.from.endsWith('@g.us')) return false;
  if (!GROUPS_RAW.length) return true; // sem filtro = monitora tudo
  if (GROUPS_RAW.some(g => msg.from === g)) return true;
  try {
    const chat = await msg.getChat();
    return GROUPS_RAW.some(g => chat.name?.toLowerCase().includes(g.toLowerCase()));
  } catch { return false; }
}

client.on('message', async msg => {
  // Ignora se fora do horário escritural de trabalho
  if (!isWorkingNow()) return;

  // Apenas grupos monitorados, mensagens de texto com substância
  if (!await isMonitored(msg)) return;
  if (!msg.body || msg.body.length < 20) return;

  let contact;
  try { contact = await msg.getContact(); } catch { contact = {}; }
  const senderPhone = contact.number || msg.author || msg.from;
  const senderName  = contact.pushname || contact.name || senderPhone;

  let groupName = msg.from;
  try { groupName = (await msg.getChat()).name || msg.from; } catch { /* ignora */ }

  console.log(`\n💬 [${groupName}] ${senderName}: ${msg.body.slice(0, 80)}...`);

  const intent = await extractIntent(msg.body);
  if (!intent.is_property_search) {
    console.log('   → não é busca de imóvel, ignorado');
    return;
  }

  const properties = await findMatches(intent);
  if (!properties.length) {
    console.log('   → nenhum imóvel compatível encontrado');
    return;
  }

  console.log(`   → ${properties.length} imóvel(is) compatível(is) — notificando`);

  const payload = { senderName, senderPhone, groupName, message: msg.body, intent, properties };
  await Promise.all([saveMatch(payload), sendTelegram(payload)]);
});

// Inicializa
client.initialize();

// Re-verifica o calendário a cada transição e loga o estado
function scheduleTransitionLog() {
  const ms = msUntilNextTransition();
  const label = isWorkingNow() ? 'dia útil' : 'descanso';
  console.log(`📅 Estado atual: ${label}. Próxima transição em ${Math.round(ms / 60000)} min`);
  setTimeout(() => {
    console.log(`\n📅 Transição de calendário — agora: ${isWorkingNow() ? 'dia útil' : 'descanso'}`);
    scheduleTransitionLog();
  }, ms);
}

scheduleTransitionLog();
