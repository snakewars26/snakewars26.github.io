// SnakeWars Service Worker — Cache stratégique
const CACHE_NAME = 'snakewars-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './preview.png',
  './icon-192.png',
  './icon-512.png',
];

// Installation : mise en cache des assets essentiels
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Cache partiel:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation : supprimer les anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch : Network-first pour le HTML/JS, Cache-first pour images
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Ignorer les requêtes externes (Ably, AdSense, Analytics...)
  if(url.origin !== location.origin) return;

  // Images : cache-first
  if(e.request.destination === 'image') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        return cached || fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // HTML/JS : network-first, fallback cache
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
