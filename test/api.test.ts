import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, cpSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { Store } from '../src/database.ts';
import { seed } from '../src/seed.ts';
import { createApp } from '../src/app.ts';

const token='test-only-private-token-32-characters-long';
async function harness(fn:(request:(path:string,method?:string,body?:unknown,auth?:boolean)=>Promise<Response>,store:Store)=>Promise<void>,published=true,staticOrigin='') {
  const dir=mkdtempSync(join(tmpdir(),'jieqi-test-'));
  cpSync(fileURLToPath(new URL('../public/assets',import.meta.url)),join(dir,'assets'),{recursive:true});
  const store=new Store(join(dir,'test.sqlite'));seed(store);if(published) store.publish();
  const server=createApp(store,{adminToken:token,assetsDir:join(dir,'assets'),staticOrigin,widgetPath:fileURLToPath(new URL('../site/public/v1/widget.js',import.meta.url))}).listen(0,'127.0.0.1');await once(server,'listening');
  const url=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request=(path:string,method='GET',body?:unknown,auth=true)=>fetch(url+path,{method,
    headers:{...(auth?{Authorization:`Bearer ${token}`} : {}),...(body===undefined?{}:{'Content-Type':Buffer.isBuffer(body)?'image/png':'application/json'})},
    body:body===undefined?undefined:Buffer.isBuffer(body)?new Uint8Array(body):JSON.stringify(body)});
  try {await fn(request,store);} finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));store.close();rmSync(dir,{recursive:true,force:true});}
}

test('admin APIs require auth; public APIs allow cross-origin reads without credentials',async()=>{
  await harness(async request=>{
    assert.equal((await request('/admin/content','GET',undefined,false)).status,401);
    assert.equal((await request('/admin/publish','POST',{},false)).status,401);
    const response=await request('/v1/calendar/2026.json','GET',undefined,false);
    assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),'*');
    const admin=await request('/admin/content');assert.equal(admin.headers.get('access-control-allow-origin'),null);
    const current=await request('/v1/resolve');assert.equal(current.headers.get('cache-control'),'no-store');
  });
});
test('draft changes stay private until publish; rollback restores active publication',async()=>{
  await harness(async(request,store)=>{
    const original=store.publication()!;
    const event={...store.content().events.find(e=>e.id==='spring-festival')!,name:'新春团圆'};
    assert.equal((await request('/admin/events/spring-festival','PUT',event)).status,200);
    const old=await(await request('/v1/resolve?date=2026-02-17')).json();assert.equal(old.popup.selected.card.name,'春节');
    const preview=await(await request('/admin/preview?date=2026-02-17')).json();assert.equal(preview.popup.selected.card.name,'新春团圆');
    assert.equal((await request('/admin/publish','POST',{})).status,201);
    const updated=await(await request('/v1/resolve?date=2026-02-17')).json();assert.equal(updated.popup.selected.card.name,'新春团圆');
    assert.equal((await request('/admin/rollback','POST',{version:original.version})).status,200);
    assert.equal(store.publication()!.version,original.version);
    assert.equal(store.content().events.find(e=>e.id==='spring-festival')!.name,'新春团圆');
  });
});
test('publishing missing images fails without replacing last good publication',async()=>{
  await harness(async(request,store)=>{
    const version=store.publication()!.version;
    const event={...store.content().events[0],image:'/assets/missing.png'};
    await request(`/admin/events/${event.id}`,'PUT',event);
    assert.equal((await request('/admin/publish','POST',{})).status,422);
    assert.equal(store.publication()!.version,version);
  });
});
test('image upload returns a content-addressed URL; rejects wrong image signatures and traversal',async()=>{
  await harness(async(request,store)=>{
    const image=readFileSync(fileURLToPath(new URL('../public/assets/labour-day-v1.png',import.meta.url)));
    const upload=await request('/admin/assets','POST',image);assert.equal(upload.status,201);
    const result=await upload.json();assert.match(result.image,/^\/assets\/[a-f0-9]{64}\.png$/);
    const downloaded=await request(result.image,'GET',undefined,false);assert.equal(downloaded.status,200);
    assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),image);
    assert.equal((await request('/admin/assets','POST',Buffer.from('not an image at all'))).status,415);
    assert.equal((await request('/admin/events/labour-day','PUT',{...store.content().events.find(e=>e.id==='labour-day'),image:'/assets/../../.env.png'})).status,400);
  });
});
test('bad dates, out-of-range years, duplicate parameters and unknown routes fail cleanly',async()=>{
  await harness(async request=>{
    for(const path of ['/v1/resolve?date=2026-02-30','/v1/resolve?date=2026-01-01&date=2026-01-02','/v1/calendar/1900','/v1/calendar/2026abc']) assert.equal((await request(path)).status,400,path);
    assert.equal((await request('/missing')).status,404);
    assert.equal((await request('/v1/calendar/2026','OPTIONS',undefined,false)).status,204);
  });
});
test('foreign keys and unannounced schedule semantics are enforced',async()=>{
  await harness(async(request,store)=>{
    assert.equal((await request('/admin/events/spring-festival','DELETE')).status,409);
    const schedule=structuredClone(store.content().schedules[0]);schedule.holidays[0].eventId='missing';
    assert.equal((await request('/admin/schedules/2026','PUT',schedule)).status,422);
    assert.equal((await request('/admin/schedules/2027','PUT',{year:2027,status:'pending',holidays:[]})).status,200);
    assert.equal((await request('/admin/schedules/2027','DELETE')).status,204);
  });
});
test('unpublished service returns 503 instead of exposing drafts',async()=>{
  await harness(async request=>{
    assert.equal((await request('/v1/manifest.json')).status,503);
    assert.equal((await request('/admin/content')).status,200);
  },false);
});
test('split-domain public responses use static URLs while admin and stored images stay portable',async()=>{
  await harness(async(request,store)=>{
    const manifest=await(await request('/v1/manifest.json')).json();
    assert.match(manifest.events.find((e:{id:string})=>e.id==='spring-festival').image,/^https:\/\/static\.jieqi\.dev\/assets\//);
    const calendar=await(await request('/v1/calendar/2026.json')).json();
    assert.match(calendar.events.find((e:{eventId:string})=>e.eventId==='spring-festival').card.image,/^https:\/\/static\.jieqi\.dev\/assets\//);
    const resolution=await(await request('/v1/resolve?date=2026-02-17')).json();
    assert.match(resolution.popup.selected.card.image,/^https:\/\/static\.jieqi\.dev\/assets\//);
    assert.match(store.publication()!.events.find(e=>e.id==='spring-festival')!.image!,/^\/assets\//);
    const admin=await(await request('/admin/content')).json();
    assert.match(admin.events.find((e:{id:string})=>e.id==='spring-festival').image,/^\/assets\//);
    const widget=await request('/v1/widget.js','GET',undefined,false);
    assert.equal(widget.status,200);
    assert.match(widget.headers.get('content-type')!,/javascript/);
    assert.equal(widget.headers.get('access-control-allow-origin'),'*');
    assert.match(await widget.text(),/static\.jieqi\.dev/);
  },true,'https://static.jieqi.dev/');
});
test('style selection replaces available illustrations, falls back explicitly and never changes stored cards',async()=>{
  await harness(async(request,store)=>{
    const styles=await(await request('/v1/styles.json')).json();assert.equal(styles.defaultStyle,'stamp');assert.equal(styles.styles.length,10);
    for(const style of ['watercolor','papercut','clay','minimal','character','anime','sweet','woodblock','embroidery']){
      const result=await(await request('/v1/resolve?date=2026-09-07&style='+style)).json();
      assert.equal(result.popup.selected.card.image,`https://static.jieqi.dev/assets/bailu-${style}.webp`);
      assert.deepEqual(result.popup.selected.card.artworkStyle,{requested:style,resolved:style,fallback:false});
    }
    const spring=await(await request('/v1/resolve?date=2026-02-17&style=watercolor')).json();
    assert.deepEqual(spring.popup.selected.card.artworkStyle,{requested:'watercolor',resolved:'watercolor',fallback:false});
    assert.match(spring.popup.selected.card.image,/spring-festival-watercolor-v1\.webp$/);
    const annual=await(await request('/v1/calendar/2027.json?style=clay')).json();
    assert.match(annual.events.find((e:{eventId:string})=>e.eventId==='term-bailu').card.image,/bailu-clay.webp$/);
    const manifest=await(await request('/v1/manifest.json?style=papercut')).json();
    assert.match(manifest.events.find((e:{id:string})=>e.id==='term-bailu').image,/bailu-papercut.webp$/);
    const plain=await(await request('/v1/resolve?date=2026-09-07')).json();
    assert.equal(plain.popup.selected.card.artworkStyle.resolved,'stamp');
    assert.notEqual(plain.popup.selected.card.image,manifest.events.find((e:{id:string})=>e.id==='term-bailu').image);
    assert.equal('artworkStyle' in store.publication()!.events[0],false);
    for(const path of ['/v1/resolve?style=unknown','/v1/resolve?style=stamp&style=clay','/v1/calendar/2026?style=../../bad','/v1/manifest.json?style=']) assert.equal((await request(path)).status,400,path);
  },true,'https://static.jieqi.dev');
});
test('nine complete artwork series cover every annual event with distinct downloadable images and no fallback',async()=>{
  await harness(async(request)=>{
    const catalog=await(await request('/v1/styles.json')).json();
    const allImages=new Set<string>();
    for(const style of ['watercolor','papercut','clay','minimal','character','anime','sweet','woodblock','embroidery']){
      const definition=catalog.styles.find((item:{id:string})=>item.id===style);
      assert.equal(definition.coverage,'complete');
      assert.equal(new Set(definition.eventIds).size,40);
      const manifest=await(await request('/v1/manifest.json?style='+style)).json();
      for(const year of [2026,2027]){
        const calendar=await(await request(`/v1/calendar/${year}.json?style=${style}`)).json();
        assert.equal(new Set(calendar.events.map((event:{eventId:string})=>event.eventId)).size,40);
        assert.deepEqual([...new Set(calendar.events.map((event:{eventId:string})=>event.eventId))].sort(),[...definition.eventIds].sort());
        for(const event of calendar.events){
          assert.deepEqual(event.card.artworkStyle,{requested:style,resolved:style,fallback:false});
          assert.equal(event.card.image,manifest.events.find((item:{id:string})=>item.id===event.eventId).image);
          if(year===2026 && event.category!=='holiday'){
            assert.equal(allImages.has(event.card.image),false);
            allImages.add(event.card.image);
            const response=await request(event.card.image,'GET',undefined,false);
            assert.equal(response.status,200,event.card.image);
            assert.match(response.headers.get('content-type')!,/image\/webp/);
            const bytes=Buffer.from(await response.arrayBuffer());
            assert.equal(bytes.toString('ascii',0,4),'RIFF');
            assert.equal(bytes.toString('ascii',8,12),'WEBP');
          }
        }
      }
    }
    assert.equal(allImages.size,360);
  });
});
test('SQLite retains publications across reconnect and setup is idempotent',()=>{
  const dir=mkdtempSync(join(tmpdir(),'jieqi-persistence-'));const path=join(dir,'db.sqlite');
  try {
    let store=new Store(path);seed(store);const version=store.publish().version;
    const event={...store.content().events[0],name:'保留修改'};store.putEvent(event);store.close();
    store=new Store(path);seed(store);assert.equal(store.publication()!.version,version);
    assert.equal(store.content().events.find(e=>e.id===event.id)!.name,'保留修改');store.close();
  } finally {rmSync(dir,{recursive:true,force:true});}
});
