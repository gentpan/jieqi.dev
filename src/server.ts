import { fileURLToPath } from 'node:url';
import { Store } from './database.ts';
import { createApp } from './app.ts';

const store=new Store(process.env.DATABASE_PATH??'./data/calendar.sqlite');
const host=process.env.HOST??'127.0.0.1';
const port=Number(process.env.PORT??4318);
if(!Number.isInteger(port)||port<1||port>65535) throw new Error('PORT 无效');
const app=createApp(store,{adminToken:process.env.ADMIN_TOKEN??'',assetsDir:fileURLToPath(new URL('../public/assets/',import.meta.url)),staticOrigin:process.env.STATIC_ORIGIN,widgetPath:fileURLToPath(new URL('../site/public/v1/widget.js',import.meta.url))});
const server=app.listen(port,host,()=>console.log(`节期后端：http://${host}:${port} · /health · /v1/resolve`));
let stopping=false;
function stop() {
  if(stopping) return;stopping=true;
  server.close(()=>{store.close();process.exit(0);});
  setTimeout(()=>{server.closeAllConnections();},5000).unref();
}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
