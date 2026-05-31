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

const { state, saveCreds } = await useMultiFileAuthState('.baileys_auth');

const PHONE = process.env.WA_PHONE || '5583996828008';

const sock = makeWASocket({
  auth: state,
  printQRInTerminal: false,
  logger: pino({ level: 'silent' }),
});

sock.ev.on('creds.update', saveCreds);

if (!state.creds.registered) {
  await new Promise(r => setTimeout(r, 3000));
  try {
    const code = await sock.requestPairingCode(PHONE);
    console.log(`\n🔑 Código de pareamento: ${code}`);
    console.log('   WhatsApp → Configurações → Dispositivos conectados → Vincular com número de telefone');
    console.log('   Digite o código acima e aguarde.\n');
  } catch (e) {
    console.log('\n📱 Código indisponível — use o QR abaixo:\n');
  }
}

sock.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    console.log('\n📱 Escaneie o QR code com o WhatsApp:\n');
    qrcode.generate(qr, { small: true });
  }

  if (connection === 'open') {
    console.log('\n📋 Grupos disponíveis:\n');
    const groups = await sock.groupFetchAllParticipating();
    const sorted = Object.entries(groups)
      .sort(([, a], [, b]) => a.subject.localeCompare(b.subject));
    sorted.forEach(([id, g]) => console.log(`  "${g.subject}"  →  ${id}`));
    console.log(`\nTotal: ${sorted.length} grupos`);
    console.log('\nCole os IDs ou parte dos nomes em WA_GROUPS no .env\n');
    process.exit(0);
  }

  if (connection === 'close') {
    const code = (lastDisconnect?.error instanceof Boom)
      ? lastDisconnect.error.output.statusCode : 0;
    if (code !== DisconnectReason.loggedOut) {
      console.log('Reconectando...');
    } else {
      console.log('Sessão encerrada. Rode novamente.');
      process.exit(1);
    }
  }
});
