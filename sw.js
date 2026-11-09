/* Cancionero: funcionamiento sin conexión. La página se actualiza cuando hay red; lo demás se guarda la primera vez. */
const CACHE='cancionero-v4';
const CORE=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.host==='api.github.com') return; // la sincronización siempre va a la red
  const isPage = req.mode==='navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');
  if(isPage){
    // primero la red (para recibir versiones nuevas), si no hay red la copia guardada
    e.respondWith(fetch(req,{cache:'no-cache'}).then(r=>{ const copy=r.clone(); caches.open(CACHE).then(c=>c.put('./index.html',copy)); return r; }).catch(()=>caches.match('./index.html')));
    return;
  }
  // el resto (fuentes, librerías, íconos): lo guardado primero, y se actualiza en segundo plano
  e.respondWith(caches.match(req).then(hit=>{
    const net=fetch(req).then(r=>{ if(r && r.ok && (url.origin===location.origin || /fonts\.|cdnjs/.test(url.host))){ const copy=r.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); } return r; }).catch(()=>hit);
    return hit||net;
  }));
});
