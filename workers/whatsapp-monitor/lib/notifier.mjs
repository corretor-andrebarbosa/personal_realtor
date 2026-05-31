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

function buildTelegramText(match) {
  const { sender_name, sender_phone, group_name, message, matched_properties } = match;

  const props = matched_properties.map((p, i) => {
    const price = fmtPrice(p.sale_price || p.price) || fmtPrice(p.rental_price) || '–';
    const addr  = (p.address || '').split(',')[0].trim();
    return `${i + 1}\\. [${p.type || 'Imóvel'} ${addr ? '— ' + addr : ''} \\| ${price}](${BASE_URL}/properties/${p.id})`;
  }).join('\n');

  const phone = sender_phone?.replace(/\D/g, '') || '';
  const waLink = phone ? `[Contatar no WhatsApp](https://wa.me/${phone})` : '';

  return [
    `🏠 *Match encontrado\\!*`,
    ``,
    `📍 *Grupo:* ${escMd(group_name)}`,
    `👤 *Corretor:* ${escMd(sender_name)} \\(\`${escMd(sender_phone || '?')}\`\\)`,
    `💬 *Mensagem:*\n_${escMd(message)}_`,
    ``,
    `*Imóveis compatíveis:*`,
    props,
    ``,
    waLink,
  ].filter(Boolean).join('\n');
}

function escMd(str) {
  return String(str || '').replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}

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
  const b = bot();
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!b || !chatId) {
    console.log('[telegram] não configurado — pulando envio');
    return;
  }
  const text = buildTelegramText({
    sender_name:        data.senderName,
    sender_phone:       data.senderPhone,
    group_name:         data.groupName,
    message:            data.message,
    matched_properties: data.properties,
  });
  try {
    await b.sendMessage(chatId, text, { parse_mode: 'MarkdownV2', disable_web_page_preview: false });
  } catch (e) {
    console.error('[telegram]', e.message);
  }
}
