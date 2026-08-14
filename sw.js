// Service worker for offline/PWA support.
//
// v2 switched from cache-first to network-first. Cache-first meant every
// deploy took two reloads to show up, so the site was permanently one version
// behind and looked like the push had silently failed.
const CACHE_NAME = 'mtg-catalogue-v2';
const APP_SHELL = ['./index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Only cache-manage our own app shell. Let card images / Scryfall API /
  // EDHREC requests go straight to the network -- we don't want to cache
  // those (storage bloat, and they need to stay fresh).
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  // Network-first, cache as the offline fallback: always serve the freshest
  // deploy when online, still work on a phone with no signal.
  event.respondWith(
    fetch(event.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return res;
    }).catch(() => caches.match(event.request))
  );
});
