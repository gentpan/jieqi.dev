import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { createHash, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { annual, chinaDate, resolveDate } from './calendar.ts';
import { eventSchema, scheduleSchema, settingsSchema, yearSchema, dateSchema, idSchema } from './schema.ts';
import type { Store } from './database.ts';
import type { Content } from './schema.ts';
import { staticOrigin, withPublicImages } from './public-urls.ts';
import { styleSchema, styleCatalog, withArtworkStyle } from './styles.ts';
import { groupedAssetPath } from './asset-paths.ts';

class HttpError extends Error {
  status:number;
  constructor(status:number,message:string) {super(message);this.status=status;}
}
const yearParam=(value:unknown)=>yearSchema.parse(Number(z.string().regex(/^\d{4}$/).parse(value)));
const hash=(value:string)=>createHash('sha256').update(value).digest();

function validateContent(content:Content,assetsDir:string) {
  content.events.forEach(e=>{
    eventSchema.parse(e);
    if(e.image && !existsSync(join(assetsDir,groupedAssetPath(e.image).slice('/assets/'.length)))) throw new HttpError(422,`图片不存在：${e.image}`);
  });
  content.schedules.forEach(s=>{
    scheduleSchema.parse(s);
    s.holidays.forEach(h=>{
      if(!content.events.some(e=>e.id===h.eventId&&e.category==='festival')) throw new HttpError(422,`假期引用了不存在的节日：${h.eventId}`);
    });
  });
  settingsSchema.parse(content.settings);
}

export function createApp(store:Store,options:{adminToken:string;assetsDir:string;staticOrigin?:string;widgetPath?:string}) {
  if(options.adminToken.length<32) throw new Error('ADMIN_TOKEN 至少需要32个字符；请运行 npm run setup');
  const app=express();
  const imageOrigin=staticOrigin(options.staticOrigin);
  const publicContent=(value:unknown,style:unknown=undefined)=>withPublicImages(withArtworkStyle(value,styleSchema.parse(style??'stamp')),imageOrigin);
  app.disable('x-powered-by');
  app.set('query parser','simple');
  app.use((_req,res,next)=>{res.set('X-Content-Type-Options','nosniff');next();});
  app.get('/health',(_req,res)=>res.json({ok:true,service:'jieqi',published:!!store.publication()}));
  const cors=(_req:Request,res:Response,next:NextFunction)=>{
    res.set('Access-Control-Allow-Origin','*');
    res.set('Access-Control-Allow-Methods','GET, HEAD, OPTIONS');
    res.set('Access-Control-Expose-Headers','ETag');
    if(_req.method==='OPTIONS') {res.sendStatus(204);return;} next();
  };
  app.use('/assets',cors);
  app.get('/assets/:filename',(req,res,next)=>{
    const grouped=groupedAssetPath(req.path);
    if(grouped===req.path) return next();
    res.redirect(308,grouped+new URL(req.originalUrl,'http://localhost').search);
  });
  app.use('/assets',express.static(options.assetsDir,{dotfiles:'deny',index:false,maxAge:'1d'}));
  app.use('/v1',cors,(_req,res,next)=>{res.set('Cache-Control','public, max-age=60');next();});
  if(options.widgetPath) app.get('/v1/widget.js',(_req,res)=>res.sendFile(options.widgetPath!));
  const published=()=>{
    const snapshot=store.publication();
    if(!snapshot) throw new HttpError(503,'尚未发布内容，请先通过管理接口发布');
    return snapshot;
  };
  app.get('/v1/styles.json',(_req,res)=>res.json({defaultStyle:'stamp',styles:styleCatalog}));
  app.get('/v1/manifest.json',(req,res)=>{
    const snapshot=published();
    res.json(publicContent({...snapshot,events:snapshot.events.filter(e=>e.enabled),styles:styleCatalog,supportedYears:{from:2000,to:2100}},req.query.style));
  });
  app.get('/v1/calendar/:year',(req,res)=>res.json(publicContent(annual(published(),yearParam(req.params.year.replace(/\.json$/,''))),req.query.style)));
  app.get('/v1/resolve',(req,res)=>{
    const date=dateSchema.parse(req.query.date??chinaDate());
    yearParam(date.slice(0,4));
    // Today's response must not survive a Beijing midnight in a shared cache.
    res.set('Cache-Control','no-store');
    res.json(publicContent(resolveDate(published(),date),req.query.style));
  });

  app.use('/admin',(req,res,next)=>{
    res.set('Cache-Control','no-store');
    if(!timingSafeEqual(hash(req.get('authorization')??''),hash(`Bearer ${options.adminToken}`))) {
      res.set('WWW-Authenticate','Bearer');res.status(401).json({error:'需要管理员令牌'});return;
    }
    next();
  });
  app.post('/admin/assets',express.raw({type:['image/png','image/jpeg','image/webp'],limit:'8mb'}),(req,res)=>{
    const body=req.body;
    if(!Buffer.isBuffer(body)||body.length<12) throw new HttpError(415,'请发送 PNG/JPEG/WebP 图片二进制');
    const mime=req.get('content-type')?.split(';')[0];
    let extension:string|undefined;
    if(mime==='image/png'&&body.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) extension='png';
    if(mime==='image/jpeg'&&body[0]===255&&body[1]===216&&body[2]===255) extension='jpg';
    if(mime==='image/webp'&&body.toString('ascii',0,4)==='RIFF'&&body.toString('ascii',8,12)==='WEBP') extension='webp';
    if(!extension) throw new HttpError(415,'图片类型与文件签名不匹配');
    const filename=`${createHash('sha256').update(body).digest('hex')}.${extension}`;
    const uploadsDir=join(options.assetsDir,'uploads');
    mkdirSync(uploadsDir,{recursive:true});
    if(!existsSync(join(uploadsDir,filename))) writeFileSync(join(uploadsDir,filename),body,{flag:'wx'});
    res.status(201).json({image:`/assets/uploads/${filename}`});
  });
  app.use('/admin',express.json({limit:'128kb'}));
  app.get('/admin/content',(_req,res)=>res.json(store.content()));
  app.get('/admin/events',(_req,res)=>res.json(store.content().events));
  app.put('/admin/events/:id',(req,res)=>{
    const id=idSchema.parse(req.params.id); const event=eventSchema.parse(req.body);
    if(id!==event.id) throw new HttpError(400,'路径ID与内容ID不同');
    store.putEvent(event);res.json(event);
  });
  app.delete('/admin/events/:id',(req,res)=>{
    const id=idSchema.parse(req.params.id);
    if(store.content().schedules.some(s=>s.holidays.some(h=>h.eventId===id))) throw new HttpError(409,'请先移除引用此节日的假期，或将节日设为 disabled');
    const result=store.db.prepare('DELETE FROM events WHERE id=?').run(id);
    if(!result.changes) throw new HttpError(404,'节日不存在');
    res.sendStatus(204);
  });
  app.get('/admin/schedules',(_req,res)=>res.json(store.content().schedules));
  app.put('/admin/schedules/:year',(req,res)=>{
    const year=yearParam(req.params.year); const schedule=scheduleSchema.parse(req.body);
    if(year!==schedule.year) throw new HttpError(400,'路径年份与内容年份不同');
    const content=store.content();
    for(const h of schedule.holidays) if(!content.events.some(e=>e.id===h.eventId&&e.category==='festival')) throw new HttpError(422,`节日不存在：${h.eventId}`);
    store.putSchedule(schedule);res.json(schedule);
  });
  app.delete('/admin/schedules/:year',(req,res)=>{
    const result=store.db.prepare('DELETE FROM schedules WHERE year=?').run(yearParam(req.params.year));
    if(!result.changes) throw new HttpError(404,'年度安排不存在'); res.sendStatus(204);
  });
  app.get('/admin/settings',(_req,res)=>res.json(store.content().settings));
  app.put('/admin/settings',(req,res)=>{
    const settings=settingsSchema.parse(req.body);store.putSettings(settings);res.json(settings);
  });
  app.get('/admin/preview',(req,res)=>{
    const date=dateSchema.parse(req.query.date??chinaDate());yearParam(date.slice(0,4));
    res.json(resolveDate({schemaVersion:1,version:'draft',publishedAt:new Date().toISOString(),...store.content()},date));
  });
  app.post('/admin/publish',(_req,res)=>{
    validateContent(store.content(),options.assetsDir);
    const snapshot=store.publish();res.status(201).json({version:snapshot.version,publishedAt:snapshot.publishedAt});
  });
  app.get('/admin/publications',(_req,res)=>{
    res.json({activeVersion:store.publication()?.version??null,versions:store.db.prepare('SELECT version,json_extract(body,\'$.publishedAt\') AS publishedAt FROM publications ORDER BY rowid DESC').all()});
  });
  app.post('/admin/rollback',(req,res)=>{
    const {version}=z.object({version:z.uuid()}).strict().parse(req.body);
    if(!store.publication(version)) throw new HttpError(404,'发布版本不存在');
    store.activate(version);res.json({version});
  });
  app.use((_req,res)=>res.status(404).json({error:'接口不存在'}));
  app.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
    res.set('Cache-Control','no-store');
    if(error instanceof ZodError) {res.status(400).json({error:'参数不正确',issues:error.issues});return;}
    if(error instanceof HttpError) {res.status(error.status).json({error:error.message});return;}
    const status=(error as {status?:number})?.status;
    if(status===413) {res.status(413).json({error:'请求内容过大'});return;}
    if(status===400) {res.status(400).json({error:'请求格式不正确'});return;}
    console.error('Request failed:',error instanceof Error ? error.name : 'UnknownError');
    res.status(500).json({error:'服务暂时不可用'});
  });
  return app;
}
