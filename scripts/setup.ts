import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { Store } from '../src/database.ts';
import { seed } from '../src/seed.ts';

if(!existsSync('.env')) {
  writeFileSync('.env',`ADMIN_TOKEN=${randomBytes(32).toString('hex')}\nHOST=127.0.0.1\nPORT=4318\nDATABASE_PATH=./data/calendar.sqlite\n`,{mode:0o600,flag:'wx'});
  console.log('已在 .env 生成管理员令牌（不在终端输出）。');
}
process.loadEnvFile('.env');
const store=new Store(process.env.DATABASE_PATH??'./data/calendar.sqlite');
seed(store);
if(!store.publication()) store.publish();
console.log(`初始化完成：${store.content().events.length} 张卡片内容、${store.content().schedules.length} 个年度安排。`);
store.close();
