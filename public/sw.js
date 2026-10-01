const CACHE='iam-omani-v18';
const CORE=['/','/index.html','/styles.css','/app.js','/manifest.json?v=18','/assets/sahwa-hero.webp?v=18','/assets/municipality-card.webp?v=18','/assets/opera-card.webp?v=18','/assets/riyam-card.webp?v=18','/oman-identity.js?v=18','/oman-home-v2.css?v=18','/oman-heritage-bg.b64?v=18','/oman-audio-v2.js?v=1','/omani-bg10.b64?v=1','/oman-villages.js?v=1','/oman-wilayat-themes.js?v=1','/game-catalog.js?v=1','/game-catalog.css?v=1','/baloot-icon.svg?v=1','/approval-flow.js','/village-directory-ui.js?v=1','/progression-ui.js','/progression-ui.css'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.pathname.startsWith('/socket.io')||u.pathname.startsWith('/api/'))return;
 const fresh=['/','/index.html','/manifest.json','/styles.css','/app.js','/assets/sahwa-hero.webp','/assets/municipality-card.webp','/assets/opera-card.webp','/assets/riyam-card.webp','/oman-identity.js','/oman-home-v2.css','/oman-heritage-bg.b64','/oman-audio-v2.js','/oman-wilayat-themes.js','/game-catalog.js','/game-catalog.css'].includes(u.pathname);
 if(fresh){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok&&u.origin===location.origin)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));return}
 e.respondWith(fetch(e.request).then(r=>{if(r.ok&&u.origin===location.origin)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
});
