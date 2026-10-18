/* Duty Calendar service worker: makes the page open offline after the first visit. */
const V = 'duty-cal-v1';
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const CDN = /(^|\.)(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const cdn = CDN.test(url.hostname);
  if (!same && !cdn) return; // never touch Supabase or other APIs

  if (cdn) {
    // fonts and the Excel library: cache first, so exports work offline
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(V).then(c => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // the app itself: network first (so updates show up), cache when offline
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(V).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./')))
  );
});
