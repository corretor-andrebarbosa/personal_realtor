import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Lazy — inicializa apenas quando usado (env já carregado no ponto de chamada)
let _groq, _sb;
const groq = () => (_groq ??= new Groq({ apiKey: process.env.GROQ_API_KEY }));
const sb   = () => (_sb   ??= createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: ws } }
));

const SYSTEM_PROMPT = `Você analisa mensagens de corretores em grupos de WhatsApp imobiliário.
Extraia a intenção de busca e retorne SOMENTE JSON válido:
{
  "is_property_search": boolean,
  "action": "venda" | "locacao" | "ambos" | null,
  "type": string | null,
  "neighborhoods": string[],
  "min_price": number | null,
  "max_price": number | null,
  "rooms": number | null,
  "notes": string | null
}
Se não for busca de imóvel (oferta, spam, conversa), retorne is_property_search: false.`;

export async function extractIntent(text) {
  try {
    const res = await groq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      max_tokens: 256,
      response_format: { type: 'json_object' },
    });
    return JSON.parse(res.choices[0].message.content);
  } catch {
    return { is_property_search: false };
  }
}

export async function findMatches(intent) {
  if (!intent.is_property_search) return [];

  let q = sb()
    .from('properties')
    .select('id, title, type, address, contract, price, saleprice, rental_price, rooms, area')
    .ilike('status', '%disponív%');

  if (intent.action === 'venda')   q = q.in('contract', ['venda', 'ambos']);
  if (intent.action === 'locacao') q = q.in('contract', ['locacao', 'ambos']);
  if (intent.type)   q = q.ilike('type', `%${intent.type}%`);
  if (intent.rooms)  q = q.eq('rooms', intent.rooms);

  if (intent.max_price) {
    if (!intent.action || intent.action === 'venda' || intent.action === 'ambos')
      q = q.or(`saleprice.lte.${intent.max_price},price.lte.${intent.max_price}`);
    else
      q = q.lte('rental_price', intent.max_price);
  }

  if (intent.neighborhoods?.length) {
    const orFilter = intent.neighborhoods.map(n => `address.ilike.%${n}%`).join(',');
    q = q.or(orFilter);
  }

  const { data, error } = await q.limit(5);
  if (error) { console.error('[matcher]', error.message); return []; }
  return data || [];
}
