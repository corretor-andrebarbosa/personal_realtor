/**
 * Cloudflare Pages Function — /blog/:slug
 * Injeta OG tags dinâmicas para preview correto no WhatsApp/redes sociais.
 * Crawlers veem HTML com a imagem de capa do artigo; browsers veem o SPA normalmente.
 */

const SITE_URL = 'https://andrebarbosaimoveis.com';

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function onRequest(context) {
  const { params, request, env } = context;
  const slug = params.slug;

  const SUPABASE_URL = env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

  // Serve o index.html base
  const indexRes = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
  let html = await indexRes.text();

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing env vars');

    // Busca o artigo no Supabase (campos mínimos para velocidade)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/blog_posts?or=(slug.eq.${encodeURIComponent(slug)},id.eq.${encodeURIComponent(slug)})&select=title,excerpt,cover_image,slug&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const posts = await res.json();
    const post = Array.isArray(posts) && posts[0];

    if (post) {
      const title = esc(post.title || 'André Barbosa Imóveis');
      const desc = esc(post.excerpt || 'Artigo sobre mercado imobiliário em João Pessoa');
      const img = esc(post.cover_image || `${SITE_URL}/newlogo.png`);
      const url = esc(`${SITE_URL}/blog/${post.slug || slug}`);

      // Substitui as OG tags existentes pelo conteúdo do artigo
      html = html
        .replace(/(<meta property="og:type" content=")[^"]*(")/,   `$1article$2`)
        .replace(/(<meta property="og:url" content=")[^"]*(")/,    `$1${url}$2`)
        .replace(/(<meta property="og:title" content=")[^"]*(")/,  `$1${title}$2`)
        .replace(/(<meta property="og:description" content=")[^"]*(")/,`$1${desc}$2`)
        .replace(/(<meta property="og:image" content=")[^"]*(")/,  `$1${img}$2`)
        .replace(/(<meta name="twitter:url" content=")[^"]*(")/,   `$1${url}$2`)
        .replace(/(<meta name="twitter:title" content=")[^"]*(")/,  `$1${title}$2`)
        .replace(/(<meta name="twitter:description" content=")[^"]*(")/,`$1${desc}$2`)
        .replace(/(<meta name="twitter:image" content=")[^"]*(")/,  `$1${img}$2`)
        .replace(/<title>[^<]*<\/title>/,  `<title>${title} | André Barbosa Imóveis</title>`);
    }
  } catch (_) {
    // Falha silenciosa — retorna index.html sem modificação
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
