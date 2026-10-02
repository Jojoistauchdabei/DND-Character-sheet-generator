/* D&D Charakterbogen – Service Worker (App-Shell offline). */
const CACHE = 'dnd-char-v17';
const ASSETS = [
  './',
  'index.html',
  'wiki.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/data.js',
  'js/config.js',
  'js/sheet.js',
  'js/convex.js',
  'js/editor.js',
  'js/pdf.js',
  'js/dm.js',
  'js/main.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'altes_Papier.png'
];

/* Dateien, die vor der Cache-Version aktualisiert werden müssen. config.js
   enthält Deployment-URL und Client-ID und wird beim Einrichten einmal
   ausgefüllt – ein gecachter Leerstand fällt sonst lange nicht auf.
   Netz zuerst, Cache als Rückfall für den Offline-Betrieb. */
const NETWORK_FIRST = new Set(['js/config.js']);

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

  if (NETWORK_FIRST.has(url.pathname.split('/').pop())) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

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
