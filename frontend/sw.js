/**
 * ORCA Service Worker — Offline Maritime PWA Caching
 * Enables offline access to emergency protocols, catch diaries, and cached coastal navigation data.
 */

const CACHE_NAME = 'orca-marine-dss-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './advisor.html',
    './map.html',
    './weather.html',
    './sos.html',
    './command_center.html',
    './catch_log.html',
    './market.html',
    './regulations.html',
    './config.js',
    './shared_nav.js',
    './manifest.json',
    './assets/orca_logo.jpg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[ORCA SW] Pre-caching offline maritime assets');
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('[ORCA SW] Pre-cache warning:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // For navigation and static files: stale-while-revalidate / cache-first
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    // Update cache in background
                    fetch(event.request).then(networkResponse => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
                        }
                    }).catch(() => {});
                    return cachedResponse;
                }
                return fetch(event.request).then(response => {
                    return response;
                }).catch(() => {
                    // Offline fallback
                    if (event.request.headers.get('accept')?.includes('text/html')) {
                        return caches.match('./index.html');
                    }
                });
            })
        );
    }
});

