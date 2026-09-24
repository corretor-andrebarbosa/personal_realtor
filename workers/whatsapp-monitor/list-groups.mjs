import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
} catch { /* ignora */ }

import { makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';

const { state, saveCreds } = await useMultiFileAuthState('.baileys_auth');
const PHONE = process.env.WA_PHONE || '5583996828008';

const sock = makeWASocket({
  auth: state,
  printQRInTerminal: false,
  browser: Browsers.macOS('Safari'), // fingerprint diferente
  logger: pino({ level: 'silent' }),
});

sock.ev.on('creds.update', saveCreds);

if (!state.creds.registered) {
  await new Promise(r => setTimeout(r, 3000));
  try {
    const code = await sock.requestPairingCode(PHONE);
    console.log(`\n Codigo de pareamento: ${code}`);
    console.log(`   WhatsApp do numero +55 83 9 9106-5450:`);
    console.log(`   Configuracoes > Dispositivos conectados > Vincular com numero de telefone`);
    console.log(`   Digite: ${code}\n`);
  } catch (e) {
    console.log('Pairing code indisponivel, aguardando QR...');
  }
}

sock.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    // Salva QR como HTML para abrir no browser (resolve problema de renderização no terminal)
    const html = `<!DOCTYPE html><html><body style="background:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}" style="width:300px;height:300px"/>
<p style="position:fixed;bottom:20px;font-family:sans-serif;color:#666">Escaneie com o WhatsApp do numero +55 83 9 9106-5450</p>
</body></html>`;
    const qrPath = join(__dir, 'qr.html');
    writeFileSync(qrPath, html);
    console.log(`\n QR Code salvo! Abra no browser:`);
    console.log(`   ${qrPath}\n`);
  }

  if (connection === 'open') {
    console.log('\n WhatsApp conectado!\n');
    console.log('Grupos disponiveis:\n');
    const groups = await sock.groupFetchAllParticipating();
    const sorted = Object.entries(groups)
      .sort(([, a], [, b]) => a.subject.localeCompare(b.subject));
    sorted.forEach(([id, g]) => console.log(`  "${g.subject}"  ->  ${id}`));
    console.log(`\nTotal: ${sorted.length} grupos`);
    console.log('\nCole os nomes em WA_GROUPS no .env e rode: npm start\n');
    process.exit(0);
  }

  if (connection === 'close') {
    const code = (lastDisconnect?.error instanceof Boom)
      ? lastDisconnect.error.output.statusCode : 0;
    console.log(`Conexao fechada. Codigo: ${code}`);
    if (code !== DisconnectReason.loggedOut) {
      console.log('Reconectando em 3s...');
      setTimeout(() => {}, 3000);
    } else {
      console.log('Sessao encerrada. Rode novamente.');
      process.exit(1);
    }
  }
});
