const CACHE = 'iam-omani-v41';
const CORE = [
  '/', '/index.html', '/styles.css?v=28', '/app.js?v=41',
  '/manifest.json?v=30', '/icon-180.png?v=30', '/icon-192.png?v=30',
  '/icon-512.png?v=30', '/oman-premium.css?v=6',
  '/oman-home-v2.css?v=30', '/oman-reference-v29.css?v=31',
  '/oman-night-scene.webp?v=29', '/oman-landmarks-v30.webp?v=30',
  '/oman-identity.js?v=40', '/oman-music.js?v=33', '/oman-audio-v2.js?v=40',
  '/omani-traditional-loop.mp3?v=35',
  '/oman-villages.js?v=1', '/approval-flow.css', '/approval-flow.js?v=40', '/approval-sync.js?v=40',
  '/village-directory-ui.js?v=1', '/progression-ui.js?v=41', '/local-questions.js?v=41', '/progression-ui.css',
  '/game-catalog.js?v=41', '/game-catalog.css?v=40', '/game-sfx.js?v=40',
  '/omani-characters.css?v=41', '/omani-characters.js?v=41', '/omani-characters-ref.b64?v=38',
  '/omani-characters.png?v=40', '/omani-heritage-characters.png?v=40',
  '/omani-traditional.mp3?v=40',
  '/characters/boy-kumma.jpeg?v=41', '/characters/two-boys-majlis.jpeg?v=41', '/characters/man-khanjar.jpeg?v=41', '/characters/elder-portrait.jpeg?v=41', '/characters/man-white-dishdasha.jpeg?v=41', '/characters/man-bisht.jpeg?v=41', '/characters/two-boys-outdoors.jpeg?v=41', '/characters/boy-purple-glasses.jpeg?v=41', '/characters/seated-omani-man.jpeg?v=41', '/baloot-icon.svg?v=37', '/firebase-auth-ui.css?v=32', '/firebase-auth-ui.js?v=32'
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