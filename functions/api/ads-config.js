/**
 * Cloudflare Pages Function — GET /api/ads-config
 *
 * Entrega às landing pages estáticas (ex.: /apto-parque-parahyba-1/) o ID da tag
 * do Google Ads e os rótulos das ações de conversão, lidos das variáveis de
 * ambiente do Cloudflare Pages. Assim nenhum ID fica fixo no código versionado.
 *
 * Variáveis (Cloudflare Pages > Settings > Environment variables):
 *   GOOGLE_ADS_ID              ex.: AW-17998623946            (aceita também VITE_GOOGLE_ADS_ID)
 *   ADS_CONVERSION_WHATSAPP    ex.: AW-17998623946/AbCdEfGh   (aceita também VITE_ADS_CONVERSION_WHATSAPP)
 *   ADS_CONVERSION_FORM        ex.: AW-17998623946/IjKlMnOp   (aceita também VITE_ADS_CONVERSION_FORM)
 *   ADS_CONVERSION_PHONE       ex.: AW-17998623946/QrStUvWx   (aceita também VITE_ADS_CONVERSION_PHONE)
 *
 * Esses valores acabam visíveis no navegador de qualquer visitante; ficam no
 * ambiente para poderem ser trocados sem mexer no código.
 */

const VALIDO = /^AW-\d{6,15}(\/[\w-]{4,64})?$/;

function ler(env, nome) {
    const v = String(env[nome] || env['VITE_' + nome] || '').trim();
    // ignora placeholders do .env.example (AW-XXXXXXXXX/...)
    return VALIDO.test(v) && !/X{4,}/.test(v) ? v : '';
}

export function onRequestGet({ env }) {
    const corpo = {
        adsId: ler(env, 'GOOGLE_ADS_ID'),
        conversions: {
            whatsapp: ler(env, 'ADS_CONVERSION_WHATSAPP'),
            form: ler(env, 'ADS_CONVERSION_FORM'),
            phone: ler(env, 'ADS_CONVERSION_PHONE'),
        },
    };
    return new Response(JSON.stringify(corpo), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            // 5 minutos de cache: uma troca de rótulo propaga rápido
            'Cache-Control': 'public, max-age=300',
        },
    });
}
