import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=new URL('../dist/',import.meta.url);
const read=name=>readFile(new URL(name,base),'utf8');
const [html,css,engine,decks,app,install]=await Promise.all(['index.html','styles.css','engine.js','decks.js','app.js','install.js'].map(read));
const script=[engine.replace(/^export /gm,''),decks.replace(/^export /gm,''),app.replace(/^import .*;\n/gm,''),install].join('\n');
let portable=html.replace('<html lang="en">','<html lang="en" data-portable="true">')
 .replace('<link rel="stylesheet" href="styles.css">',()=>`<style>${css}</style>`)
 .replace(/<link rel="(?:manifest|apple-touch-icon)"[^>]+>\n/g,'')
 .replace('<script type="module" src="app.js"></script>\n<script src="install.js" defer></script>',()=>`<script>\n(()=>{\n${script.replace(/<\/script/gi,'<\\/script')}\n})();\n</script>`);
await writeFile(new URL('Recall_Loop.html',base),portable);
const names=['index.html','styles.css','engine.js','decks.js','app.js','install.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','Recall_Loop.html'];
const hash=createHash('sha256');for(const name of names)hash.update(await readFile(new URL(name,base)));
const version=hash.digest('hex').slice(0,14);
const sw=`const PREFIX='recall-loop-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+'${version}';
const PATHS=${JSON.stringify(names.map(n=>'./'+n))};
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
`;
await writeFile(new URL('sw.js',base),sw);
console.log(JSON.stringify({portableBytes:Buffer.byteLength(portable),cacheVersion:version,offlineAssets:names.length}));
