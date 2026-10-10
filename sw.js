/* 3D Price PWA: cache offline somente arquivos do próprio app. */
const VERSION='3d-price-pwa-v3-tesouro';
const CORE=['./','./index.html','./styles.css','./styles/treasure.css?v=20261009-1','./src/app.js?v=20261009-1','./src/calculator.js','./src/printerCatalog.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys()){if(key.startsWith('3d-price-pwa-')&&key!==VERSION)await caches.delete(key)}await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 if(req.mode==='navigate'){event.respondWith((async()=>{try{const res=await fetch(req);if(res.ok){const cache=await caches.open(VERSION);await cache.put('./index.html',res.clone())}return res}catch{return (await caches.match('./index.html'))||Response.error()}})());return}
 event.respondWith((async()=>{const cached=await caches.match(req);if(cached)return cached;try{const res=await fetch(req);if(res.ok){const cache=await caches.open(VERSION);await cache.put(req,res.clone())}return res}catch{return Response.error()}})())
});
