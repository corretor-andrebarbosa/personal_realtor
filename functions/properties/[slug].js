/**
 * Cloudflare Pages Function — /properties/[slug]
 *
 * Detecta crawlers de redes sociais (WhatsApp, Facebook, etc.) e serve OG tags
 * pré-renderizadas para a prévia do link. Usuários normais E motores de busca
 * (Googlebot/Bingbot) recebem o SPA de verdade — eles renderizam JS e devem
 * indexar a página completa (preço, descrição, galeria, JSON-LD), não este
 * resumo raso. Incluir googlebot/bingbot aqui seria servir conteúdo mais pobre
 * pro Google do que pro usuário — o oposto do que se quer para SEO.
 *
 * Aceita tanto a URL amigável nova (/properties/apartamento-3-quartos-jardim-oceania-4)
 * quanto o id numérico antigo (/properties/4) — extrai o id do fim do slug pra
 * buscar o imóvel, e sempre monta og:url com a URL canônica (com slug).
 *
 * Equivalente ao middleware.js do Vercel, mas para Cloudflare Pages.
 */

const BOT_REGEX =
    /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot/i;

const SITE_URL = 'https://andrebarbosaimoveis.com';

function extractIdFromSlug(value) {
    const match = String(value || '').match(/-(\d+)$/);
    if (match) return match[1];
    return /^\d+$/.test(String(value || '')) ? String(value) : null;
}

export async function onRequest(context) {
    const { request, params, env } = context;
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = BOT_REGEX.test(userAgent);

    const slugParam = params.slug;

    if (!isBot || !slugParam) {
        // Usuário normal — devolve o index.html do SPA
        return env.ASSETS.fetch(new Request(new URL('/', request.url)));
    }

    // Bot detectado — busca dados do imóvel no Supabase
    try {
        const supabaseUrl = env.VITE_SUPABASE_URL;
        const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return env.ASSETS.fetch(new Request(new URL('/', request.url)));
        }

        const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
        const select = 'id,slug,title,description,image,images';

        // 1) tenta casar pelo slug exato
        let res = await fetch(
            `${supabaseUrl}/rest/v1/properties?slug=eq.${encodeURIComponent(slugParam)}&select=${select}`,
            { headers }
        );
        let data = await res.json();
        let property = Array.isArray(data) ? data[0] : null;

        // 2) fallback: extrai o id do fim do slug (ou id puro, pra links antigos)
        if (!property) {
            const id = extractIdFromSlug(slugParam);
            if (id) {
                res = await fetch(
                    `${supabaseUrl}/rest/v1/properties?id=eq.${encodeURIComponent(id)}&select=${select}`,
                    { headers }
                );
                data = await res.json();
                property = Array.isArray(data) ? data[0] : null;
            }
        }

        if (!property) {
            return env.ASSETS.fetch(new Request(new URL('/', request.url)));
        }

        const title = property.title || 'Imóvel — André Barbosa';
        const description = (property.description || 'Confira este imóvel exclusivo com André Barbosa Corretor.').substring(0, 200);
        const image =
            property.image ||
            (Array.isArray(property.images) && property.images.length > 0
                ? property.images[0]
                : null) ||
            'https://andrebarbosaimoveis.com/newlogo.png';

        // URL canônica: sempre a versão com slug, mesmo que o crawler tenha batido no id antigo
        const pageUrl = `${SITE_URL}/properties/${property.slug || property.id}`;

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="André Barbosa Imóveis" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <!-- Redirect real users to the SPA immediately -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(pageUrl)}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />
</body>
</html>`;

        return new Response(html, {
            headers: {
                'content-type': 'text/html; charset=UTF-8',
                'cache-control': 'no-store',
            },
        });
    } catch (err) {
        // Erro → serve o SPA normalmente
        return env.ASSETS.fetch(new Request(new URL('/', request.url)));
    }
}

/** Escapa caracteres HTML para evitar XSS nas meta tags */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
