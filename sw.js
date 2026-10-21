// SnakeWars Service Worker — cache stratégique
const CACHE_NAME = 'snakewars-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.json',
  './favicon.png',
  './preview.png',
  './icon-192.png',
  './icon-512.png',
];

// Installation : mise en cache tolérante (un fichier manquant n'annule plus tout)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(ASSETS.map(a => cache.add(a)))
    )
  );
  self.skipWaiting();
});

// Activation : supprimer les anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function putInCache(req, res) {
  if (res && res.ok) {
    const clone = res.clone();
    caches.open(CACHE_NAME).then(c => c.put(req, clone));
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Ignorer les requêtes externes (Ably, AdSense, Analytics...)
  if (url.origin !== location.origin) return;

  // Images : cache-first
  if (req.destination === 'image') {
    e.respondWith(
      caches.match(req).then(cached =>
        cached || fetch(req).then(res => { putInCache(req, res); return res; })
      )
    );
    return;
  }

  // HTML / JS / CSS : network-first, repli sur le cache hors-ligne
  e.respondWith(
    fetch(req)
      .then(res => { putInCache(req, res); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
