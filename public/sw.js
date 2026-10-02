const CACHE = 'iam-omani-v30';
const CORE = [
  '/', '/index.html', '/styles.css?v=28', '/app.js?v=30',
  '/manifest.json?v=30', '/icon-180.png?v=30', '/icon-192.png?v=30',
  '/icon-512.png?v=30', '/oman-premium.css?v=6',
  '/oman-home-v2.css?v=30', '/oman-reference-v29.css?v=30',
  '/oman-night-scene.webp?v=29', '/oman-landmarks-v30.webp?v=30',
  '/oman-identity.js?v=30', '/oman-audio-v2.js?v=28',
  '/oman-villages.js?v=1', '/approval-flow.css', '/approval-flow.js',
  '/village-directory-ui.js?v=1', '/progression-ui.js',
  '/progression-ui.css', '/firebase-auth-ui.css?v=2', '/firebase-auth-ui.js?v=2'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('iam-omani-') && key !== CACHE)
      .map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin ||
      url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request, {cache: 'no-store'}).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(async () => (await caches.match(event.request)) || (await caches.match('/index.html'))));
});
