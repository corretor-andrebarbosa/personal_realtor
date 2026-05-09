// Simple Service Worker for PWA offline shell - v6 [2026-05-08 network-first]
const CACHE_NAME = 'ab-imoveis-v6';
const urlsToCache = ['/'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // 1. Ignorar completamente chamadas de API externas (Supabase, etc.)
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // 2. Apenas lidar com requisições GET
    if (event.request.method !== 'GET') {
        return;
    }

    // 3. Arquivos JS/CSS/módulos: SEMPRE buscar da rede (nunca servir do cache)
    //    Evita servir código antigo após atualizações do app
    const url = new URL(event.request.url);
    const isAsset = /\.(js|jsx|ts|tsx|css|mjs)(\?.*)?$/.test(url.pathname);
    if (isAsset) {
        return; // Deixa passar para a rede sem interceptar
    }

    // 4. Para navegação e outros recursos: network-first, cache como fallback offline
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    if (event.request.mode === 'navigate') {
                        return caches.match('/');
                    }
                    return new Response('Network error occurred', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({ 'Content-Type': 'text/plain' })
                    });
                });
            })
    );
});
