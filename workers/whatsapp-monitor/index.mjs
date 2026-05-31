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

import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

import { isWorkingNow, msUntilNextTransition } from './lib/calendar.mjs';
import { extractIntent, findMatches } from './lib/matcher.mjs';
import { saveMatch, sendTelegram } from './lib/notifier.mjs';

const GROUPS_RAW = (process.env.WA_GROUPS || '').split(',').map(s => s.trim()).filter(Boolean);

let sock;
let groupCache = {}; // id → name

const PHONE = process.env.WA_PHONE || '5583996828008';

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState('.baileys_auth');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  if (!state.creds.registered) {
    await new Promise(r => setTimeout(r, 2000));
    const code = await sock.requestPairingCode(PHONE);
    console.log(`\n🔑 Código de pareamento: ${code}`);
    console.log('   WhatsApp → Configurações → Dispositivos conectados → Vincular com número de telefone\n');
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Escaneie o QR code:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp conectado — monitorando grupos');
      const groups = await sock.groupFetchAllParticipating();
      Object.entries(groups).forEach(([id, g]) => { groupCache[id] = g.subject; });
      console.log(`   ${Object.keys(groupCache).length} grupos carregados`);
    }

    if (connection === 'close') {
      const code = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode : 0;
      if (code !== DisconnectReason.loggedOut) {
        console.log('⚠️  Desconectado — reconectando em 5s...');
        setTimeout(connect, 5000);
      } else {
        console.log('❌ Sessão encerrada. Rode novamente para escanear o QR.');
        process.exit(1);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      if (!from?.endsWith('@g.us')) continue; // só grupos

      // Verifica se é grupo monitorado
      const groupName = groupCache[from] || from;
      if (GROUPS_RAW.length > 0) {
        const monitored = GROUPS_RAW.some(g =>
          from === g || groupName.toLowerCase().includes(g.toLowerCase())
        );
        if (!monitored) continue;
      }

      // Ignora se fora do horário escritural
      if (!isWorkingNow()) continue;

      const text = msg.message.conversation
        || msg.message.extendedTextMessage?.text
        || '';
      if (text.length < 20) continue;

      const senderPhone = (msg.key.participant || from).replace('@s.whatsapp.net', '').replace('@g.us', '');
      const senderName  = msg.pushName || senderPhone;

      console.log(`\n💬 [${groupName}] ${senderName}: ${text.slice(0, 80)}...`);

      const intent = await extractIntent(text);
      if (!intent.is_property_search) { console.log('   → não é busca de imóvel'); continue; }

      const properties = await findMatches(intent);
      if (!properties.length) { console.log('   → sem imóveis compatíveis'); continue; }

      console.log(`   → ${properties.length} match(es) — notificando`);
      const payload = { senderName, senderPhone, groupName, message: text, intent, properties };
      await Promise.all([saveMatch(payload), sendTelegram(payload)]);
    }
  });
}

// Calendário: loga transições de estado
function scheduleTransitionLog() {
  const ms = msUntilNextTransition();
  console.log(`📅 Estado: ${isWorkingNow() ? 'dia útil' : 'descanso'} — próx. transição em ${Math.round(ms / 60000)} min`);
  setTimeout(scheduleTransitionLog, ms);
}

connect();
scheduleTransitionLog();
