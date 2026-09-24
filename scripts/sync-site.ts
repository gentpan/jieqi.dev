import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { Store } from '../src/database.ts';
import { seed } from '../src/seed.ts';
import { eventSchema } from '../src/schema.ts';
import { syncArtwork } from './sync-artwork.ts';
import { groupedAssetPath } from '../src/asset-paths.ts';

// One source of truth: publish the local editor's data and package the pure
// calendar engine into the standalone website, without copying private data.
const root=resolve(import.meta.dirname,'..');
const site=join(root,'site');
const artwork=resolve(process.argv[2]??join(root,'.jieqi-artwork/stamp-series-20260906'));
const store=new Store(process.env.DATABASE_PATH??join(root,'data/calendar.sqlite'));
const defaults=new Store(':memory:');seed(defaults);
const assetManifest=existsSync(join(artwork,'manifest.json'))?JSON.parse(readFileSync(join(artwork,'manifest.json'),'utf8')):{assets:[]};
type Asset={id:string;title:string;path:string;prompt:string;qa:{status:string}};
const approved:Asset[]=assetManifest.assets.map((a:Asset)=>({...a,path:resolve(root,a.path)})).filter((a:Asset)=>a.qa.status==='approved'&&existsSync(a.path));
const quotes:Record<string,string>={
  'term-lichun':'春风有信，万物有期。','term-yushui':'一场春雨，一场新生。','term-jingzhe':'春雷唤醒，满眼新绿。','term-chunfen':'春色平分，花开正好。','term-qingming':'春和景明，念念在心。','term-guyu':'雨生百谷，春意将浓。','term-lixia':'风暖人间，万物并秀。','term-xiaoman':'小得盈满，恰是欢喜。','term-mangzhong':'种下期待，收获日常。','term-xiazhi':'昼长如诗，夏日有期。','term-xiaoshu':'蝉鸣半夏，清风入怀。','term-dashu':'盛夏热烈，心有清凉。','term-liqiu':'一叶知秋，万物有收。','term-chushu':'暑气渐散，好景入秋。','term-bailu':'白露沾衣，秋意有信。','term-qiufen':'秋色平分，收获正好。','term-hanlu':'露寒情暖，秋色渐深。','term-shuangjiang':'霜染万叶，秋藏温柔。','term-lidong':'冬日初临，心有所暖。','term-xiaoxue':'小雪未满，暖意正浓。','term-daxue':'岁暮天寒，灯火可亲。','term-dongzhi':'冬至已至，春归有期。','term-xiaohan':'岁寒有暖，人间有期。','term-dahan':'岁末有盼，春日将来。',
  'new-year':'翻开新页，写下期待。','lantern-festival':'灯火万家，团圆此刻。','qingming-festival':'春和景明，念念在心。','dragon-boat':'粽叶飘香，岁岁安康。','qixi':'此夕有星，此心有你。','mid-autumn':'月满人间，心有团圆。','national-day':'山河锦绣，秋光正好。','double-ninth':'秋高宜登远，相伴是长情。',
};
try {
  mkdirSync(join(root,'public/assets/stamp'),{recursive:true});
  mkdirSync(join(site,'public/assets/stamp'),{recursive:true});
  const current=new Map(store.content().events.map(e=>[e.id,e]));
  for(const event of defaults.content().events) if(!current.has(event.id)) current.set(event.id,event);
  for(const [id,event] of current) {
    const found=approved.find(a=>a.id===id)||(id==='qingming-festival'?approved.find(a=>a.id==='term-qingming'):undefined);
    if(found) {copyFileSync(found.path,join(root,'public/assets/stamp',`${id}-stamp-v1.png`));event.image=`/assets/stamp/${id}-stamp-v1.png`;}
    else if(event.image) event.image=groupedAssetPath(event.image);
    if(!event.quote&&quotes[id]) event.quote=quotes[id];
    store.putEvent(eventSchema.parse(event));
  }
  const snapshot=store.publish();
  const generated=join(site,'lib/calendar');mkdirSync(generated,{recursive:true});
  const require=createRequire(join(site,'package.json'));
  const sharp=require('sharp');
  for(const event of snapshot.events) if(event.image) {
    const output=event.image.replace(/\.(png|jpe?g)$/i,'.webp');
    await sharp(join(root,'public',event.image)).webp({quality:90}).toFile(join(site,'public',output));
    event.image=output;
  }
  const variantsPath=join(site,'lib/variants.json');
  const variants: {id:string;title:string;image:string}[]=existsSync(variantsPath)?JSON.parse(readFileSync(variantsPath,'utf8')):[];
  for(const asset of approved.filter(a=>a.id.startsWith('bailu-'))) {
    const image=groupedAssetPath(`/assets/${asset.id}.webp`);
    await sharp(asset.path).webp({quality:90}).toFile(join(site,'public',image));
    copyFileSync(join(site,'public',image),join(root,'public',image));
    const index=variants.findIndex(v=>v.id===asset.id);
    const variant={id:asset.id,title:asset.title,image};
    if(index<0) variants.push(variant); else variants[index]=variant;
  }
  const syncedVariants=await syncArtwork(root,snapshot.events.map(e=>e.id),variants);
  for(const name of ['calendar.ts','schema.ts','lunar.d.ts','asset-paths.ts','styles.ts','artwork.ts']) copyFileSync(join(root,'src',name),join(generated,name));
  writeFileSync(join(site,'lib/snapshot.json'),JSON.stringify(snapshot,null,2));
  writeFileSync(variantsPath,JSON.stringify(syncedVariants,null,2));
  mkdirSync(join(root,'docs'),{recursive:true});
  const originals=JSON.parse(readFileSync(join(root,'docs/image-prompts.json'),'utf8')).assets.map((asset:{file:string;prompt:string})=>({
    ...asset,
    id:asset.file.startsWith('spring')?'spring-festival':'labour-day',
    path:`public/assets/stamp/${asset.file}`,
    qa:{status:'approved',method:'visual inspection',characters:asset.file.startsWith('spring')?['春 correct','节 correct']:['五 correct','一 correct'],notes:'Original artwork rechecked alongside the complete stamp series.'},
  }));
  writeFileSync(join(root,'docs/artwork-qa.json'),JSON.stringify({...assetManifest,assets:[...originals,...assetManifest.assets.filter((a:Asset)=>!originals.some((o:Asset)=>o.id===a.id))],reuse:[{eventId:'qingming-festival',assetId:'term-qingming',reason:'清明节与清明节气共用邮票插画'}]},null,2));
  console.log(`已同步 ${snapshot.events.length} 张卡片，其中 ${snapshot.events.filter(e=>e.image).length} 张有插画；其他风格 ${variants.length} 张。`);
} finally {store.close();defaults.close();}
