// Utilitário: lista todos os grupos do WhatsApp e seus IDs
// Execute: npm run list-groups
// Cole os IDs ou nomes desejados em WA_GROUPS no .env

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

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
});

client.on('qr', qr => {
  console.log('\n📱 Escaneie o QR code:\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
  console.log('\n📋 Grupos disponíveis:\n');
  const chats = await client.getChats();
  const groups = chats.filter(c => c.isGroup);
  groups
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(g => console.log(`  "${g.name}"  →  ${g.id._serialized}`));
  console.log(`\nTotal: ${groups.length} grupos`);
  console.log('\nCole os IDs ou parte dos nomes em WA_GROUPS no .env\n');
  await client.destroy();
});

client.initialize();
