// Conversões do Google Ads nas páginas de imóvel (clique em WhatsApp, em Ligar e
// envio do formulário da planta baixa).
// Os rótulos vêm de /api/ads-config (variáveis de ambiente do Cloudflare Pages),
// os mesmos usados pela landing /apto-parque-parahyba-1/. Sem rótulo configurado,
// só o evento nomeado é registrado e nenhuma conversão é enviada.

// Mesmos nomes de evento e valores padrão da landing (public/apto-parque-parahyba-1/assets/lp.js).
const EVENTOS = { whatsapp: 'whatsapp_click', phone: 'phone_click', form: 'lead_form_submit' };
const VALORES = { whatsapp: 30, phone: 30, form: 10 };

let configPromise = null;

function carregarConfig() {
    if (!configPromise) {
        configPromise = fetch('/api/ads-config', { credentials: 'omit' })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null); // normal no Vite dev: a função só existe no Cloudflare
    }
    return configPromise;
}

/**
 * Registra o contato (clique ou formulário enviado). Nunca lança erro nem atrasa
 * a abertura do WhatsApp/telefone/planta: o envio acontece em segundo plano.
 * @param {'whatsapp'|'phone'|'form'} tipo
 * @param {string} [rotulo] identificação do imóvel (ex.: slug)
 */
export function trackAdsConversion(tipo, rotulo) {
    try {
        if (typeof window === 'undefined' || typeof window.gtag !== 'function' || !EVENTOS[tipo]) return;
        window.gtag('event', EVENTOS[tipo], { event_category: 'lead', event_label: rotulo || '' });
        carregarConfig().then((config) => {
            const sendTo = config && config.conversions && config.conversions[tipo];
            if (sendTo) {
                window.gtag('event', 'conversion', { send_to: sendTo, value: VALORES[tipo], currency: 'BRL' });
            }
        });
    } catch { /* medição nunca pode quebrar o contato */ }
}
