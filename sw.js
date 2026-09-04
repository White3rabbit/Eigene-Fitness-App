/* Service Worker – macht die App offline nutzbar.
   Bei Änderungen an den Dateien die VERSION erhöhen, damit Handys die neue Fassung laden. */
const VERSION = 'mein-training-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/storage.js',
  './js/default-program.js',
  './js/app.js',
  './img/icon.svg',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/exercises/barbell.svg',
  './img/exercises/dumbbell.svg',
  './img/exercises/kettlebell.svg',
  './img/exercises/bodyweight.svg',
  './img/exercises/core.svg',
  './img/exercises/cardio.svg',
  './img/exercises/machine.svg',
  './img/exercises/stretch.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Strategie: zuerst aus dem Cache antworten, im Hintergrund aktualisieren (stale-while-revalidate).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // externe Bilder etc. nur online

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
