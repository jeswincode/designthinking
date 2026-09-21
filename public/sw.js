/* Cache the standalone application shell, never user records. */
importScripts('./offline-assets.js');
const ROOT=new URL('./',self.registration.scope).href;
const PREFIX='faculty-shell-'+encodeURIComponent(new URL(ROOT).pathname)+'-';
const CACHE=PREFIX+self.FACULTY_BUILD;
const ASSETS=self.FACULTY_ASSETS.map(asset=>new URL(asset,ROOT).href);
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll([ROOT,...ASSETS]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys()){
      if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  if(url.href!==ROOT&&!ASSETS.includes(url.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(event.request.mode==='navigate'){
      try{
        const fresh=await fetch(event.request);
        if(fresh.ok&&!fresh.redirected)await cache.put(ROOT,fresh.clone());
        return fresh;
      }catch{
        return await cache.match(ROOT)||new Response('Open this workspace online once to enable offline use.',{status:503});
      }
    }
    return await cache.match(event.request)||fetch(event.request);
  })());
});
