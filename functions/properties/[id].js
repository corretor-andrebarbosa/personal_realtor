/**
 * Cloudflare Pages Function — /properties/[id]
 *
 * Detecta bots (WhatsApp, Facebook, etc.) e serve OG tags corretas.
 * Usuários normais são redirecionados para o SPA (index.html).
 *
 * Equivalente ao middleware.js do Vercel, mas para Cloudflare Pages.
 */

const SUPABASE_URL = 'https://kavjusgxohdpvkeknyjz.supabase.co';
const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthdmp1c2d4b2hkcHZrZWtueWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzODIxMzIsImV4cCI6MjA4Njk1ODEzMn0.9hCRW3v1FXOaIGGTZy5ECLsemUmUls_9w-p3PzuNMRo';

const BOT_REGEX =
    /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|TelegramBot|Slackbot|googlebot|bingbot|Discordbot/i;

export async function onRequest(context) {
    const { request, params, env } = context;
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = BOT_REGEX.test(userAgent);

    const id = params.id;

    if (!isBot || !id) {
        // Usuário normal — devolve o index.html do SPA
        return env.ASSETS.fetch(new Request(new URL('/', request.url)));
    }

    // Bot detectado — busca dados do imóvel no Supabase
    try {
        const supabaseUrl = env.VITE_SUPABASE_URL || SUPABASE_URL;
        const supabaseKey = env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

        const res = await fetch(
            `${supabaseUrl}/rest/v1/properties?id=eq.${encodeURIComponent(id)}&select=title,description,image,images`,
            {
                headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                },
            }
        );

        const data = await res.json();
        const property = Array.isArray(data) ? data[0] : null;

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

        const pageUrl = request.url;

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
