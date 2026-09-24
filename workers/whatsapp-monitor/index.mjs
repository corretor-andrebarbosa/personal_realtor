import { readFileSync, writeFileSync } from 'fs';
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
import { saveMatch, sendTelegram, sendDMAlert } from './lib/notifier.mjs';

const GROUPS_RAW = (process.env.WA_GROUPS || '').split(',').map(s => s.trim()).filter(Boolean);
const AUTH_DIR   = process.env.WA_AUTH_DIR || '.baileys_auth';
const MODE       = process.env.WA_MODE || 'all'; // 'group' | 'dm' | 'all'

let sock;
let groupCache = {};
let hasConnectedOnce = false;
let isConnected = false;

// ── Health endpoint ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(isConnected ? '✅ WhatsApp conectado' : '⏳ Aguardando QR scan');
}).listen(PORT, () => console.log(`[${AUTH_DIR}] Health: http://localhost:${PORT}`));

// ── QR ────────────────────────────────────────────────────────────────────────
function printQR(qr) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qr)}`;
  try {
    writeFileSync(join(__dir, `qr-${AUTH_DIR.replace('.baileys_auth', '') || 'main'}.html`), `<!DOCTYPE html>
<html><head><title>WhatsApp QR</title><meta http-equiv="refresh" content="20"></head>
<body style="background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif">
  <h2 style="color:#128C7E;margin-bottom:8px">Escaneie com o WhatsApp</h2>
  <p style="color:#666;margin-bottom:24px;font-size:14px">Sessão: ${AUTH_DIR}</p>
  <img src="${url}" style="width:300px;height:300px;border:6px solid #128C7E;border-radius:12px"/>
  <p style="color:#999;margin-top:16px;font-size:13px">Atualiza automaticamente a cada 20s</p>
</body></html>`);
  } catch {}
  console.log(`\n📱 QR [${AUTH_DIR}]: ${url}`);
  console.log('   WhatsApp → Dispositivos conectados → + → Escanear QR\n');
}

// ── Conexão ───────────────────────────────────────────────────────────────────
async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(join(__dir, AUTH_DIR));

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
      console.log(`✅ WhatsApp conectado [${AUTH_DIR}] — modo: ${MODE}`);

      if (MODE !== 'dm') {
        const groups = await sock.groupFetchAllParticipating();
        Object.entries(groups).forEach(([id, g]) => { groupCache[id] = g.subject; });
        const monitorados = GROUPS_RAW.length
          ? Object.values(groupCache).filter(n => GROUPS_RAW.some(g => n.toLowerCase().includes(g.toLowerCase())))
          : Object.values(groupCache);
        if (GROUPS_RAW.length && !monitorados.length) {
          console.log('   ⚠️  Nenhum grupo correspondeu ao filtro WA_GROUPS. Grupos disponíveis:');
          Object.values(groupCache).sort().forEach(n => console.log(`      • ${n}`));
        } else {
          console.log(`   Grupos: ${monitorados.join(', ')}`);
        }
      }
      if (MODE !== 'group') {
        console.log('   DMs diretos: monitorando');
      }
    }

    if (connection === 'close') {
      isConnected = false;
      const code = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode : 0;
      if (code === DisconnectReason.loggedOut && hasConnectedOnce) {
        console.log('❌ Sessão revogada. Apague a pasta de auth e rode novamente.');
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
      const isGroup = from?.endsWith('@g.us');
      const isDM    = from?.endsWith('@s.whatsapp.net');

      if (!isGroup && !isDM) continue;
      if (isGroup && MODE === 'dm') continue;
      if (isDM   && MODE === 'group') continue;

      const text = msg.message.conversation
        || msg.message.extendedTextMessage?.text
        || msg.message.imageMessage?.caption
        || '';
      if (text.length < 5) continue;

      const senderPhone = (msg.key.participant || from)
        .replace('@s.whatsapp.net', '').replace('@g.us', '');
      const senderName  = msg.pushName || senderPhone;

      // ── DM direto ────────────────────────────────────────────────────────
      if (isDM) {
        console.log(`\n📩 [DM] ${senderName} (${senderPhone}): ${text.slice(0, 80)}`);
        const intent     = await extractIntent(text);
        const properties = intent.is_property_search ? await findMatches(intent) : [];
        await sendDMAlert({ senderName, senderPhone, message: text, properties });
        continue;
      }

      // ── Mensagem de grupo ─────────────────────────────────────────────────
      const groupName = groupCache[from] || from;
      if (GROUPS_RAW.length > 0) {
        const monitored = GROUPS_RAW.some(g =>
          from === g || groupName.toLowerCase().includes(g.toLowerCase())
        );
        if (!monitored) continue;
      }

      if (!isWorkingNow()) continue;
      if (text.length < 20) continue;

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
  console.log(`📅 [${AUTH_DIR}] ${isWorkingNow() ? 'dia útil' : 'descanso'} — próx. transição em ${Math.round(ms / 60000)} min`);
  setTimeout(scheduleTransitionLog, ms);
}

connect();
scheduleTransitionLog();
