/**
 * Cloudflare Pages Function — /sitemap.xml
 *
 * Gera o sitemap dinamicamente a partir do Supabase, então cada imóvel e
 * cada post do blog aparece automaticamente sem precisar editar um arquivo
 * estático a cada novo cadastro. Se o Supabase falhar por qualquer motivo,
 * cai num sitemap mínimo (só as páginas estáticas) — nunca retorna erro.
 */

const SITE_URL = 'https://andrebarbosaimoveis.com';

const STATIC_URLS = [
    { loc: '/', hreflang: { 'pt-BR': '/', en: '/en' } },
    { loc: '/en', hreflang: { 'pt-BR': '/', en: '/en' } },
    { loc: '/litoral' },
    { loc: '/campo' },
    { loc: '/imoveis' },
    { loc: '/blog' },
    { loc: '/parceiros' },
    { loc: '/busca-inteligente' },
    { loc: '/ecovalle-sape/' },
    { loc: '/chacaras_do_brejo/' },
];

function esc(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function urlEntry(loc, { lastmod, hreflang } = {}) {
    const links = hreflang
        ? Object.entries(hreflang).map(([lang, path]) => `<xhtml:link rel="alternate" hreflang="${esc(lang)}" href="${esc(SITE_URL + path)}" />`).join('\n')
        : '';
    return `<url>\n<loc>${esc(SITE_URL + loc)}</loc>\n${lastmod ? `<lastmod>${esc(lastmod)}</lastmod>\n` : ''}${links}\n</url>`;
}

function buildFallbackSitemap() {
    const body = STATIC_URLS.map((u) => urlEntry(u.loc, u)).join('\n\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n\n${body}\n\n</urlset>`;
}

export async function onRequest(context) {
    const { env } = context;

    try {
        const supabaseUrl = env.VITE_SUPABASE_URL;
        const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase env vars');

        const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

        const [propsRes, blogRes] = await Promise.all([
            fetch(`${supabaseUrl}/rest/v1/properties?select=id,status,hidden,created_at`, { headers }),
            fetch(`${supabaseUrl}/rest/v1/blog_posts?select=slug,created_at,updated_at`, { headers }),
        ]);

        const properties = propsRes.ok ? await propsRes.json() : [];
        const posts = blogRes.ok ? await blogRes.json() : [];

        const propertyEntries = (Array.isArray(properties) ? properties : [])
            // mesmo filtro de visibilidade usado na Home pública: nada de oculto,
            // só status que realmente aparece pro visitante
            .filter((p) => !p.hidden && (p.status === 'Disponível' || p.status === 'Vendido'))
            .map((p) => urlEntry(`/properties/${p.id}`, { lastmod: p.created_at ? p.created_at.slice(0, 10) : undefined }));

        const blogEntries = (Array.isArray(posts) ? posts : [])
            .filter((p) => p.slug)
            .map((p) => urlEntry(`/blog/${p.slug}`, { lastmod: (p.updated_at || p.created_at || '').slice(0, 10) || undefined }));

        const staticEntries = STATIC_URLS.map((u) => urlEntry(u.loc, u));

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n\n${[...staticEntries, ...propertyEntries, ...blogEntries].join('\n\n')}\n\n</urlset>`;

        return new Response(xml, {
            headers: {
                'content-type': 'application/xml; charset=UTF-8',
                'cache-control': 'public, max-age=3600',
            },
        });
    } catch (err) {
        return new Response(buildFallbackSitemap(), {
            headers: {
                'content-type': 'application/xml; charset=UTF-8',
                'cache-control': 'public, max-age=300',
            },
        });
    }
}
