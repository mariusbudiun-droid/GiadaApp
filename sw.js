/* Giada - Service Worker
   Per forzare aggiornamento: incrementa CACHE_VERSION */
'use strict';
const CACHE_VERSION = 'giada-v1.3.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/themes.css',
  './css/base.css',
  './js/config.js',
  './js/data.js',
  './js/app.js',
  './js/sync.js',
  './js/welcome.js',
  './js/meals.js',
  './js/ui.js',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML: network-first per prendere subito gli aggiornamenti
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Altri asset: cache-first
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
