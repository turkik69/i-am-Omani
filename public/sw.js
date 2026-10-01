const CACHE='iam-omani-v27';
const CORE=['/','/index.html','/styles.css','/app.js','/manifest.json?v=27','/icon.svg?v=27','/oman-identity.js','/oman-v27.css?v=27','/oman-audio-v2.js','/omani-bg10.b64?v=1','/assets/v25/landmarks.01.b64','/assets/v25/landmarks.02.b64','/assets/v25/landmarks.03.b64','/assets/v25/landmarks.04.b64','/assets/v25/landmarks.05.b64','/oman-villages.js?v=1','/oman-wilayat-themes.js?v=1','/game-catalog.js?v=1','/game-catalog.css?v=1','/baloot-icon.svg?v=1','/approval-flow.js','/village-directory-ui.js?v=1','/progression-ui.js','/progression-ui.css'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.pathname.startsWith('/socket.io')||u.pathname.startsWith('/api/'))return;
 const fresh=['/','/index.html','/manifest.json','/styles.css','/app.js','/icon.svg','/oman-identity.js','/oman-v27.css','/oman-audio-v2.js','/omani-bg10.b64'].includes(u.pathname)||u.pathname.startsWith('/assets/v25/landmarks.');
 if(fresh){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok&&u.origin===location.origin)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));return}
 e.respondWith(fetch(e.request).then(r=>{if(r.ok&&u.origin===location.origin)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
});
