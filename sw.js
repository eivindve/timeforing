// Enkel service worker: appen fungerer utan nett.
// Byt versjonsnummer under når du har oppdatert filene, så hentar telefonen nye.
const CACHE = 'timeforing-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Kall til Supabase og andre domene skal aldri gå gjennom cachen.
  if (new URL(req.url).origin !== location.origin) return;
  const copyToCache = r => {
    if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  };
  // Sjølve appen: prøv nett først (så oppdateringar kjem raskt), cache når du er utan nett.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(copyToCache).catch(() => caches.match(req, { ignoreSearch: true }).then(h => h || caches.match('./index.html'))));
    return;
  }
  // Ikon og manifest: vis frå cache med ein gong, oppdater i bakgrunnen.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(copyToCache).catch(() => hit);
      return hit || net;
    })
  );
});
