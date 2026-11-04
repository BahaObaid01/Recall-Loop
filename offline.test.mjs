import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../dist/',import.meta.url);
async function workerHarness(scopePath="/"){
 const prefix="recall-loop-"+encodeURIComponent("https://recall.test"+scopePath)+"-";
 const handlers={},stores=new Map([['unrelated-cache',new Map()],[prefix+'old',new Map()],['recall-loop-other-installation',new Map()]]);
 const cacheApi=store=>({
  async addAll(requests){for(const req of requests){const name=new URL(req.url).pathname.slice(scopePath.length);store.set(req.url,new Response(await readFile(new URL(name,root))));}},
  async match(input){return store.get(typeof input==='string'?input:input.url)?.clone();}
 });
 const cacheStorage={async open(name){if(!stores.has(name))stores.set(name,new Map());return cacheApi(stores.get(name));},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);},async match(req,opts){return cacheApi(stores.get(opts.cacheName)||new Map()).match(req);}};
 const self={registration:{scope:'https://recall.test'+scopePath},location:{origin:'https://recall.test'},clients:{async claim(){}},addEventListener:(name,fn)=>{handlers[name]=fn;}};
 vm.runInNewContext(await readFile(new URL('sw.js',root),'utf8'),{self,caches:cacheStorage,URL,Request,fetch:()=>Promise.reject(new Error('Offline'))});
 async function lifecycle(name){let pending;handlers[name]({waitUntil:p=>pending=p});await pending;}
 async function request(path,navigate=false){let response;handlers.fetch({request:{method:'GET',url:'https://recall.test'+path,mode:navigate?'navigate':'cors'},respondWith:p=>response=p});return response?await response:undefined;}
 await lifecycle('install');await lifecycle('activate');
 return {request,stores,prefix};
}
test('offline navigation and every required asset work when network requests fail',async()=>{
 const {request,stores,prefix}=await workerHarness();
 assert.match(await (await request('/',true)).text(),/Recall Loop/);
 assert.match(await (await request('/Recall_Loop.html',true)).text(),/data-portable="true"/);
 for(const asset of ['app.js','engine.js','decks.js','install.js','styles.css','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'])assert.ok((await request('/'+asset)).ok,asset);
 assert.equal(await request('/unknown',true),undefined);
 assert.equal(stores.has('unrelated-cache'),true);
 assert.equal(stores.has(prefix+'old'),false);
});
test('portable copy has no external code or styles and contains valid standalone JavaScript',async()=>{
 const html=await readFile(new URL('Recall_Loop.html',root),'utf8');
 assert.doesNotMatch(html,/<script[^>]+src=|<link rel="stylesheet"|<link rel="manifest"/);
 const code=html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
 assert.doesNotMatch(code,/^import /m);new vm.Script(code);
 assert.match(html,/The answer stays hidden/);
});

test('GitHub repository path works offline and preserves another installation cache',async()=>{
 const {request,stores}=await workerHarness('/recall-loop/');
 for(const path of ['','index.html','Recall_Loop.html']) assert.match(await (await request('/recall-loop/'+path,true)).text(),/Recall Loop/);
 for(const path of ['app.js','engine.js','styles.css','manifest.webmanifest','icons/icon-192.png']) assert.ok((await request('/recall-loop/'+path)).ok);
 assert.equal(await request('/',true),undefined);
 assert.equal(stores.has('recall-loop-other-installation'),true);
 const manifest=JSON.parse(await readFile(new URL('manifest.webmanifest',root),'utf8'));
 for(const field of ['id','start_url','scope']) assert.equal(new URL(manifest[field],'https://recall.test/recall-loop/manifest.webmanifest').pathname,'/recall-loop/');
});
