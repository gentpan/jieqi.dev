import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, existsSync, cpSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const path=process.env.DATABASE_PATH??'./data/calendar.sqlite';
if(!existsSync(path)) throw new Error('数据库不存在，请先初始化');
const output=resolve('data/backups',new Date().toISOString().replace(/[:.]/g,'-'));
mkdirSync(output,{recursive:true,mode:0o700});
const db=new DatabaseSync(path,{readOnly:true});
try {
  await backup(db,join(output,'calendar.sqlite'));
  cpSync(fileURLToPath(new URL('../public/assets',import.meta.url)),join(output,'assets'),{recursive:true});
  console.log(`数据库和图片已备份：${output}`);
} finally {db.close();}
