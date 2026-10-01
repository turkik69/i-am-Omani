const CACHE='iam-omani-v10';
const CORE=['/','/index.html','/styles.css','/app.js','/manifest.json?v=7','/icon.svg?v=7','/oman-identity.js?v=6','/oman-premium.css?v=6','/oman-audio-v2.js?v=1','/omani-bg10.b64?v=1','/oman-villages.js?v=1','/approval-flow.js','/village-directory-ui.js?v=1','/progression-ui.js','/progression-ui.css','/firebase-auth-ui.css?v=2','/firebase-auth-ui.js?v=2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.pathname.startsWith('/socket.io')||u.pathname.startsWith('/api/')) return;
  const fresh=['/','/index.html','/manifest.json','/icon.svg','/oman-identity.js','/oman-premium.css','/oman-audio-v2.js','/oman-villages.js','/village-directory-ui.js','/firebase-auth-ui.css','/firebase-auth-ui.js'].includes(u.pathname);
  if(fresh){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok&&u.origin===location.origin){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{if(r.ok&&u.origin===location.origin){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
});
