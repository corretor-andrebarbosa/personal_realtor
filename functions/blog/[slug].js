/**
 * Cloudflare Pages Function — /blog/:slug
 * Detecta bots (WhatsApp, Facebook, etc.) e serve OG tags corretas.
 * Usuários normais são redirecionados para o SPA (index.html).
 */

const SITE_URL = 'https://andrebarbosaimoveis.com';

const BOT_REGEX =
    /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|TelegramBot|Slackbot|googlebot|bingbot|Discordbot/i;

function esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export async function onRequest(context) {
    const { params, request, env } = context;
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = BOT_REGEX.test(userAgent);
    const slug = params.slug;

    if (!isBot || !slug) {
        return env.ASSETS.fetch(new Request(new URL('/', request.url)));
    }

    const SUPABASE_URL = env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

    try {
        if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing env vars');

        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&select=title,excerpt,cover_image,slug&limit=1`,
            {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                },
            }
        );

        const posts = await res.json();
        const post = Array.isArray(posts) && posts[0];

        if (!post) throw new Error('Post not found');

        const title = esc(post.title || 'André Barbosa Imóveis');
        const desc = esc(post.excerpt || 'Artigo sobre mercado imobiliário em João Pessoa');
        const img = esc(post.cover_image || `${SITE_URL}/newlogo.png`);
        const url = esc(`${SITE_URL}/blog/${post.slug || slug}`);

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${title} | André Barbosa Imóveis</title>

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="André Barbosa Imóveis" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${url}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${img}" />

  <!-- Redireciona usuários reais para o SPA -->
  <meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body>
  <h1>${title}</h1>
  <p>${desc}</p>
  <img src="${img}" alt="${title}" />
</body>
</html>`;

        return new Response(html, {
            headers: {
                'content-type': 'text/html; charset=UTF-8',
                'cache-control': 'no-store',
            },
        });
    } catch (_) {
        return env.ASSETS.fetch(new Request(new URL('/', request.url)));
    }
}
