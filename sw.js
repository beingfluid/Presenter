// @ts-nocheck
/// <reference lib="webworker" />
// Presenter service worker — offline-first cache for app shell.
// Cache version: bump to force update.
const CACHE = 'presenter-v12';

// Files that make up the app shell (relative to scope).
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/themes.css',
  './css/transitions.css',
  './css/features.css',
  './js/app.js',
  './js/autoplay.js',
  './js/code.js',
  './js/contextmenu.js',
  './js/editor.js',
  './js/fonts.js',
  './js/guides.js',
  './js/imagefilters.js',
  './js/layers.js',
  './js/menu.js',
  './js/player.js',
  './js/ribbon.js',
  './js/statusbar.js',
  './js/storage.js',
  './js/templates.js',
  './js/shapes.js',
  './js/dnd.js',
  './js/findreplace.js',
  './js/exports.js',
  './js/annotate.js',
  './js/speaker.js',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    // {cache: 'reload'} bypasses the HTTP cache so the freshly bumped SW
    // version always pulls the LATEST source files, not whatever the
    // browser had cached from a previous visit.
    caches.open(CACHE).then(cache =>
      cache.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
    // Notify any open tabs that a new version is live so they can reload
    // themselves and pick up the fresh JS/CSS instead of running the old
    // code that’s already in their page. Without this the first reload
    // after a SW bump still runs the previous cached bundle.
    const cs = await self.clients.matchAll({ type: 'window' });
    cs.forEach(c => c.postMessage({ type: 'sw-updated', version: CACHE }));
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Network-first for navigation; cache fallback.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        const cached = await caches.match('./index.html');
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Same-origin static assets: cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch {
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Cross-origin (fonts, monaco CDN): stale-while-revalidate.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => cached);
    return cached || fetchPromise;
  })());
});
