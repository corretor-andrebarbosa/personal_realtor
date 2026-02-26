// Simple Service Worker for PWA offline shell - v2.3
const CACHE_NAME = 'ab-imoveis-v3';
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
    // 1. Ignorar completamente chamadas de API externas (Supabase)
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // 2. Apenas lidar com requisições GET
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) return response;
                return fetch(event.request).catch(err => {
                    // Se for navegação, manda pro index
                    if (event.request.mode === 'navigate') {
                        return caches.match('/');
                    }
                    // Se não, retorna um erro de rede amigável
                    return new Response('Network error occurred', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({ 'Content-Type': 'text/plain' })
                    });
                });
            })
    );
});
