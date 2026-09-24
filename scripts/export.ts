import { mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { Store } from '../src/database.ts';
import { annual, chinaDate } from '../src/calendar.ts';
import { yearSchema } from '../src/schema.ts';
import { groupedAssetPath } from '../src/asset-paths.ts';

const years=(process.argv.slice(2).length?process.argv.slice(2):[chinaDate().slice(0,4)]).map(v=>yearSchema.parse(Number(v)));
const store=new Store(process.env.DATABASE_PATH??'./data/calendar.sqlite');
try {
  const published=store.publication();if(!published) throw new Error('尚未发布内容');
  const snapshot=structuredClone(published);
  for(const event of snapshot.events) if(event.image) event.image=groupedAssetPath(event.image);
  const output=resolve('dist',snapshot.version);mkdirSync(join(output,'v1','calendar'),{recursive:true});
  writeFileSync(join(output,'v1','manifest.json'),JSON.stringify({...snapshot,events:snapshot.events.filter(e=>e.enabled),supportedYears:{from:2000,to:2100}},null,2));
  for(const year of years) writeFileSync(join(output,'v1','calendar',`${year}.json`),JSON.stringify(annual(snapshot,year),null,2));
  cpSync(fileURLToPath(new URL('../public/assets',import.meta.url)),join(output,'assets'),{recursive:true});
  console.log(`静态发布包：${output}`);
} finally {store.close();}
