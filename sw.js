/* Kin - Service Worker con auto-update silenzioso */
'use strict';
const CACHE_VERSION = 'kin-v042';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css-base.css',
  './css-themes.css',
  './js-config.js',
  './js-data.js',
  './js-app.js',
  './js-sync.js',
  './js-welcome.js',
  './js-phases.js',
  './js-growth-data.js',
  './js-growth.js',
  './js-vaccines-data.js',
  './js-teeth.js',
  './js-firsts.js',
  './js-photos.js',
  './js-health.js',
  './js-home.js',
  './js-tracking.js',
  './js-diary.js',
  './js-settings.js',
  './js-backup.js',
  './js-pdfexport.js',
  './js-ui.js',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  './favicon-32.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS)));
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
