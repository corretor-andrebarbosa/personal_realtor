import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

let _sb;
const supabase = () => (_sb ??= createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: ws } }
));

let _bot = null;
function bot() {
  if (!_bot && process.env.TELEGRAM_BOT_TOKEN) {
    _bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  }
  return _bot;
}

const BASE_URL = 'https://andrebarbosaimoveis.com';

function fmtPrice(p) {
  if (!p || p === 0) return null;
  if (p >= 1000000) return `R$ ${(p / 1000000).toFixed(2).replace('.', ',')}M`;
  if (p >= 1000)    return `R$ ${(p / 1000).toFixed(0)}k`;
  return `R$ ${p.toLocaleString('pt-BR')}`;
}

function escMd(str) {
  return String(str || '').replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}

async function sendMsg(text) {
  const b = bot();
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!b || !chatId) { console.log('[telegram] não configurado'); return; }
  try {
    await b.sendMessage(chatId, text, { parse_mode: 'MarkdownV2', disable_web_page_preview: false });
  } catch (e) {
    console.error('[telegram]', e.message);
  }
}

// ── Match de grupo: property matching completo ────────────────────────────────
export async function saveMatch(data) {
  const { error } = await supabase().from('whatsapp_matches').insert([{
    sender_name:        data.senderName,
    sender_phone:       data.senderPhone,
    group_name:         data.groupName,
    message:            data.message,
    intent:             data.intent,
    matched_properties: data.properties,
    read:               false,
  }]);
  if (error) console.error('[notifier:supabase]', error.message);
}

export async function sendTelegram(data) {
  const props = data.properties.map((p, i) => {
    const price = fmtPrice(p.sale_price || p.price) || fmtPrice(p.rental_price) || '–';
    const addr  = (p.address || '').split(',')[0].trim();
    return `${i + 1}\\. [${p.type || 'Imóvel'} ${addr ? '— ' + addr : ''} \\| ${price}](${BASE_URL}/properties/${p.id})`;
  }).join('\n');

  const phone = (data.senderPhone || '').replace(/\D/g, '');
  const waLink = phone ? `[Contatar no WhatsApp](https://wa.me/${phone})` : '';

  const text = [
    `🏠 *Match encontrado\\!*`,
    ``,
    `📍 *Grupo:* ${escMd(data.groupName)}`,
    `👤 *Corretor:* ${escMd(data.senderName)} \\(\`${escMd(data.senderPhone || '?')}\`\\)`,
    `💬 *Mensagem:*\n_${escMd(data.message)}_`,
    ``,
    `*Imóveis compatíveis:*`,
    props,
    ``,
    waLink,
  ].filter(Boolean).join('\n');

  await sendMsg(text);
}

// ── DM direto: alerta imediato sem property matching ─────────────────────────
export async function sendDMAlert(data) {
  const phone = (data.senderPhone || '').replace(/\D/g, '');
  const waLink = phone ? `[Responder no WhatsApp](https://wa.me/${phone})` : '';

  const propsSection = data.properties?.length
    ? [``, `*Imóveis que podem interessar:*`,
       ...data.properties.map((p, i) => {
         const price = fmtPrice(p.sale_price || p.price) || fmtPrice(p.rental_price) || '–';
         const addr  = (p.address || '').split(',')[0].trim();
         return `${i + 1}\\. [${p.type || 'Imóvel'} ${addr ? '— ' + addr : ''} \\| ${price}](${BASE_URL}/properties/${p.id})`;
       })]
    : [];

  const text = [
    `📩 *Mensagem direta recebida\\!*`,
    ``,
    `👤 *De:* ${escMd(data.senderName)} \\(\`${escMd(data.senderPhone || '?')}\`\\)`,
    `💬 *Mensagem:*\n_${escMd(data.message)}_`,
    ...propsSection,
    ``,
    waLink,
  ].filter(Boolean).join('\n');

  await sendMsg(text);
}
