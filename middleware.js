export const config = {
    matcher: '/properties/:id',
};

export default async function middleware(request) {
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|googlebot|bingbot/i.test(userAgent);

    if (isBot) {
        const url = new URL(request.url);
        const id = url.pathname.split('/').pop();

        if (id && !isNaN(id)) {
            try {
                const supabaseUrl = "https://kavjusgxohdpvkeknyjz.supabase.co";
                const supabaseKey = "sb_publishable_IJSaRoMEiCXgRDKIDLnvdA_E6rk5wEi";

                const res = await fetch(`${supabaseUrl}/rest/v1/properties?id=eq.${id}&select=*`, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });

                const data = await res.json();
                const property = data[0];

                if (property) {
                    const title = property.title || 'Imóvel';
                    const description = (property.description || '').substring(0, 200);
                    const image = property.image || (property.images && Array.isArray(property.images) ? property.images[0] : null) || 'https://andrebarbosaimoveis.com/newlogo.png';

                    return new Response(
                        `<!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <meta property="og:title" content="${title}">
                <meta property="og:description" content="${description}">
                <meta property="og:image" content="${image}">
                <meta property="og:type" content="website">
                <meta property="og:url" content="${request.url}">
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:title" content="${title}">
                <meta name="twitter:description" content="${description}">
                <meta name="twitter:image" content="${image}">
              </head>
              <body>
                <h1>${title}</h1>
                <p>${description}</p>
                <img src="${image}" />
              </body>
            </html>`,
                        {
                            headers: { 'content-type': 'text/html; charset=UTF-8' },
                        }
                    );
                }
            } catch (e) {
                // Fallback to normal if error
            }
        }
    }

    // Not a bot or error, continue normally
    return;
}
