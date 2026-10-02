/* D&D Charakterbogen – Service Worker (App-Shell offline). */
const CACHE = 'dnd-char-v17';
const ASSETS = [
  './',
  'index.html',
  'wiki.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/data.js',
  'js/sheet.js',
  'js/editor.js',
  'js/pdf.js',
  'js/dm.js',
  'js/main.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'altes_Papier.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/sw.js')) return;

  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});
