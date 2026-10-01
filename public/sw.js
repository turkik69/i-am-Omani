const CACHE='iam-omani-v12';
const CORE=['/','/index.html','/styles.css','/app.js','/manifest.json?v=7','/icon.svg?v=8','/oman-identity.js?v=7','/oman-premium.css?v=6','/oman-home-v2.css?v=2','/oman-heritage-scene.svg?v=2','/sahwa-tower.svg?v=8','/muscat-municipality.svg?v=8','/royal-opera.svg?v=8','/riyam.svg?v=8','/oman-audio-v2.js?v=1','/omani-bg10.b64?v=1','/oman-villages.js?v=1','/oman-wilayat-themes.js?v=1','/game-catalog.js?v=1','/game-catalog.css?v=1','/baloot-icon.svg?v=1','/approval-flow.js','/village-directory-ui.js?v=1','/progression-ui.js','/progression-ui.css'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.pathname.startsWith('/socket.io')||u.pathname.startsWith('/api/')) return;
  const fresh=['/','/index.html','/manifest.json','/icon.svg','/oman-identity.js','/oman-premium.css','/oman-home-v2.css','/oman-heritage-scene.svg','/sahwa-tower.svg','/muscat-municipality.svg','/royal-opera.svg','/riyam.svg','/oman-audio-v2.js','/oman-villages.js','/oman-wilayat-themes.js','/game-catalog.js','/game-catalog.css','/baloot-icon.svg','/village-directory-ui.js'].includes(u.pathname);
  if(fresh){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok&&u.origin===location.origin){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{if(r.ok&&u.origin===location.origin){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
});
