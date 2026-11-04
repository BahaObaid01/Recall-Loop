const PREFIX='recall-loop-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+'83e1906f031489';
const PATHS=["./index.html","./styles.css","./engine.js","./decks.js","./app.js","./install.js","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./Recall_Loop.html"];
const URLS=PATHS.map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(URLS.map(url=>new Request(url,{cache:'reload'})));})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys()){if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);}await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){
  const portable=url.pathname.endsWith('/Recall_Loop.html');
  const root=new URL('./',self.registration.scope).pathname;
  if(!portable&&url.pathname!==root&&url.pathname!==root+'index.html')return;
  event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(new URL(portable?'./Recall_Loop.html':'./index.html',self.registration.scope).href);return cached||fetch(event.request);})());
 }else if(URLS.includes(url.href)){
  event.respondWith((async()=>{const cached=await caches.match(event.request,{cacheName:CACHE});return cached||fetch(event.request);})());
 }
});
