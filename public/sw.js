const CACHE = 'iam-omani-v66';
const CORE = [
  '/', '/index.html', '/styles.css?v=28', '/app.js?v=66',
  '/manifest.json?v=30', '/icon-180.png?v=30', '/icon-192.png?v=30',
  '/icon-512.png?v=30', '/oman-premium.css?v=6',
  '/oman-home-v2.css?v=30', '/oman-reference-v29.css?v=45',
  '/oman-night-scene.webp?v=29', '/landmarks/sahwa.webp?v=45', '/landmarks/municipality.webp?v=45', '/landmarks/opera.webp?v=45', '/landmarks/riyam.webp?v=45',
  '/oman-identity.js?v=45', '/oman-music.js?v=33', '/oman-audio-v2.js?v=62',
  '/omani-traditional-loop.mp3?v=35',
  '/oman-villages.js?v=45', '/approval-flow.css', '/approval-flow.js?v=64', '/approval-sync.js?v=40',
  '/village-directory-ui.js?v=1', '/progression-ui.js?v=66', '/progression-ui.css?v=66',
  '/online-practice.js?v=66', '/online-practice.css?v=66', '/game-catalog.js?v=59', '/game-catalog.css?v=52', '/game-sfx.js?v=40', '/game-enhancements.js?v=52', '/uno.js?v=59', '/uno.css?v=45', '/card-games.js?v=59', '/card-games.css?v=49',
  '/omani-characters.css?v=57', '/omani-characters.js?v=57',
  '/characters/heritage-mussar-khanjar.js?v=57', '/characters/heritage-traditional-woman.js?v=57', '/characters/heritage-palm-weaver.js?v=57',
  '/characters/omani-portrait-8.js?v=56', '/characters/omani-portrait-9.js?v=56', '/characters/omani-portrait-10.js?v=56', '/characters/omani-portrait-11.js?v=56', '/omani-characters-ref.b64?v=38',
  '/omani-characters.png?v=40', '/omani-heritage-characters.png?v=40',
  '/omani-traditional.mp3?v=40',
  '/baloot-icon.svg?v=37', '/firebase-auth-ui.css?v=32', '/firebase-auth-ui.js?v=32', '/social-profile.js?v=66', '/social-profile.css?v=66'
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
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cached=await caches.match('/index.html');
      const refresh=fetch(event.request,{cache:'no-store'}).then(async response=>{
        if(response.ok && response.headers.get('content-type')?.includes('text/html')){
          const body=await response.clone().text();
          if(body.includes('id="app"')&&body.includes('أنا عُماني')){
            const cache=await caches.open(CACHE);
            await cache.put('/index.html',response.clone());
          }
        }
        return response;
      });
      if(cached){event.waitUntil(refresh.catch(()=>{}));return cached;}
      return refresh;
    })());
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request, {cache: 'no-store'}).then(response => {
    if (response.ok) {
      const type=response.headers.get('content-type')||'';
      const isSplash=type.includes('text/html') && !url.pathname.endsWith('.html') && url.pathname!=='/';
      if(!isSplash){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    }
    return response;
  })).catch(async () => (await caches.match(event.request)) || (await caches.match('/index.html'))));
});
