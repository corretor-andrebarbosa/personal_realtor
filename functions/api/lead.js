/**
 * Cloudflare Pages Function — POST /api/lead
 *
 * Recebe o formulário das landing pages (ex.: /apto-parque-parahyba-1/),
 * grava o lead na tabela `leads` do Supabase (aparece no painel admin)
 * e envia uma cópia por e-mail via Resend.
 *
 * Responde 200 se o lead foi guardado em pelo menos um destino
 * (Supabase ou e-mail) — a landing page só registra a conversão após 200.
 *
 * Variáveis de ambiente (Cloudflare Pages > Settings > Environment variables;
 * localmente em .dev.vars — nunca versionar):
 *   VITE_SUPABASE_URL           (já existe no projeto)
 *   SUPABASE_SERVICE_ROLE_KEY   (recomendado: grava mesmo com RLS; marcar como "Secret")
 *   VITE_SUPABASE_ANON_KEY      (fallback se não houver service role)
 *   RESEND_API_KEY              (marcar como "Secret")
 *   LEAD_EMAIL_TO               e-mail que recebe os leads
 *   LEAD_EMAIL_FROM             opcional; padrão "Leads <onboarding@resend.dev>"
 */

const MAX_LEN = { nome: 80, prazo: 40, pagina: 120, gclid: 200 };

function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
}

function limpar(valor, max) {
    return String(valor || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
}

function escapeHtml(v) {
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function nomeDoImovel(pagina) {
    if (pagina.includes('parque-parahyba-1')) return 'Apto Parque Parahyba 1 (R$ 1.200.000)';
    return pagina || 'Landing page';
}

async function gravarNoSupabase(env, lead) {
    const url = env.VITE_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase não configurado');

    // A tabela `leads` tem: name, phone, interest, status (sem coluna de orçamento).
    // Prazo, origem e gclid vão em `interest` (legível no painel e fácil de extrair
    // depois para importação de conversões offline no Google Ads).
    const interest = [
        lead.imovel,
        'Prazo: ' + lead.prazo,
        lead.gclid ? 'Origem: Google Ads' : 'Origem: site',
        lead.gclid ? 'gclid: ' + lead.gclid : null,
        'Recebido: ' + lead.recebidoEm,
    ].filter(Boolean).join(' | ');

    const res = await fetch(`${url}/rest/v1/leads`, {
        method: 'POST',
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
        },
        body: JSON.stringify([{
            name: lead.nome,
            phone: lead.telefone,
            interest,
            status: lead.prazo === 'Imediatamente' || lead.prazo === 'Em até 3 meses' ? 'Quente' : 'Morno',
        }]),
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
}

async function enviarEmail(env, lead) {
    if (!env.RESEND_API_KEY || !env.LEAD_EMAIL_TO) throw new Error('E-mail não configurado');

    const linhas = [
        ['Imóvel', lead.imovel],
        ['Nome', lead.nome],
        ['Telefone', lead.telefone],
        ['Prazo de compra', lead.prazo],
        ['Origem', lead.gclid ? 'Google Ads' : 'Site'],
        ['gclid', lead.gclid || '—'],
        ['Recebido em', lead.recebidoEm],
    ];
    const wa = `https://wa.me/55${lead.telefone.replace(/^55/, '')}`;
    const html =
        `<h2>Novo lead — ${escapeHtml(lead.imovel)}</h2><table cellpadding="6">` +
        linhas.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${escapeHtml(v)}</td></tr>`).join('') +
        `</table><p><a href="${wa}">Responder no WhatsApp</a></p>`;

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: env.LEAD_EMAIL_FROM || 'Leads <onboarding@resend.dev>',
            to: [env.LEAD_EMAIL_TO],
            subject: `Novo lead: ${lead.nome} — ${lead.imovel}`,
            html,
        }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export async function onRequestPost({ request, env }) {
    let body;
    try {
        body = await request.json();
    } catch {
        return json({ ok: false, erro: 'JSON inválido' }, 400);
    }

    // Robô preencheu o campo isca: finge sucesso, não grava nada.
    if (body.website) return json({ ok: true });

    const nome = limpar(body.nome, MAX_LEN.nome);
    const telefone = String(body.telefone || '').replace(/\D/g, '');
    const prazo = limpar(body.prazo, MAX_LEN.prazo);
    const pagina = limpar(body.pagina, MAX_LEN.pagina);
    const gclid = limpar(body.gclid, MAX_LEN.gclid).replace(/[^\w-]/g, '');

    if (nome.length < 2 || telefone.length < 10 || telefone.length > 13 || !prazo) {
        return json({ ok: false, erro: 'Dados incompletos' }, 422);
    }

    const lead = {
        nome,
        telefone,
        prazo,
        gclid,
        imovel: nomeDoImovel(pagina),
        recebidoEm: new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' }),
    };

    const [supa, email] = await Promise.allSettled([gravarNoSupabase(env, lead), enviarEmail(env, lead)]);
    if (supa.status === 'rejected') console.error('[lead] Supabase:', supa.reason?.message);
    if (email.status === 'rejected') console.error('[lead] E-mail:', email.reason?.message);

    if (supa.status === 'rejected' && email.status === 'rejected') {
        return json({ ok: false, erro: 'Falha ao registrar o lead' }, 502);
    }
    return json({ ok: true, supabase: supa.status === 'fulfilled', email: email.status === 'fulfilled' });
}

export function onRequest() {
    return json({ ok: false, erro: 'Método não permitido' }, 405);
}
