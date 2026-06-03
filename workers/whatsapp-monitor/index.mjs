import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, '.env');
try {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...rest] = line.split('=');
    if (k && !k.startsWith('#') && rest.length) {
      const v = rest.join('=').trim();
      if (v) process.env[k.trim()] = v;
    }
  });
} catch { /* Railway usa env vars nativas */ }

import { makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';

import { isWorkingNow, msUntilNextTransition } from './lib/calendar.mjs';
import { extractIntent, findMatches } from './lib/matcher.mjs';
import { saveMatch, sendTelegram } from './lib/notifier.mjs';

const GROUPS_RAW = (process.env.WA_GROUPS || '').split(',').map(s => s.trim()).filter(Boolean);

let sock;
let groupCache = {};
let hasConnectedOnce = false;
let isConnected = false;

// ── Health endpoint (Railway exige porta ligada) ──────────────────────────────
const PORT = process.env.PORT || 3000;
createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(isConnected ? '✅ WhatsApp conectado' : '⏳ Aguardando QR scan');
}).listen(PORT, () => console.log(`Health: http://localhost:${PORT}`));

// ── QR display (funciona local e em logs do Railway) ─────────────────────────
function printQR(qr) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qr)}`;
  console.log('\n══════════════════════════════════════════════');
  console.log('📱 ESCANEIE O QR CODE:');
  console.log('   Abra a URL abaixo no browser e escaneie com o WhatsApp:');
  console.log(`   ${url}`);
  console.log('   WhatsApp → Dispositivos conectados → + → Escanear QR');
  console.log('══════════════════════════════════════════════\n');
}

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(join(__dir, '.baileys_auth'));

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.macOS('Safari'),
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) printQR(qr);

    if (connection === 'open') {
      hasConnectedOnce = true;
      isConnected = true;
      console.log('✅ WhatsApp conectado — monitorando grupos');
      const groups = await sock.groupFetchAllParticipating();
      Object.entries(groups).forEach(([id, g]) => { groupCache[id] = g.subject; });
      console.log(`   ${Object.keys(groupCache).length} grupos carregados`);

      const monitorados = GROUPS_RAW.length
        ? Object.values(groupCache).filter(n => GROUPS_RAW.some(g => n.toLowerCase().includes(g.toLowerCase())))
        : Object.values(groupCache);

      if (GROUPS_RAW.length && !monitorados.length) {
        console.log('   ⚠️  Nenhum grupo correspondeu ao filtro WA_GROUPS. Grupos disponíveis:');
        Object.values(groupCache).sort().forEach(n => console.log(`      • ${n}`));
      } else {
        console.log(`   Monitorando: ${monitorados.join(', ')}`);
      }
    }

    if (connection === 'close') {
      isConnected = false;
      const code = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode : 0;

      if (code === DisconnectReason.loggedOut && hasConnectedOnce) {
        console.log('❌ Sessão revogada. Apague .baileys_auth e reinicie.');
        process.exit(1);
      } else {
        console.log(`⚠️  Desconectado (${code}) — reconectando em 5s...`);
        setTimeout(connect, 5000);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      if (!from?.endsWith('@g.us')) continue;

      const groupName = groupCache[from] || from;
      if (GROUPS_RAW.length > 0) {
        const monitored = GROUPS_RAW.some(g =>
          from === g || groupName.toLowerCase().includes(g.toLowerCase())
        );
        if (!monitored) continue;
      }

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

function scheduleTransitionLog() {
  const ms = msUntilNextTransition();
  console.log(`📅 Estado: ${isWorkingNow() ? 'dia útil' : 'descanso'} — próx. transição em ${Math.round(ms / 60000)} min`);
  setTimeout(scheduleTransitionLog, ms);
}

connect();
scheduleTransitionLog();
