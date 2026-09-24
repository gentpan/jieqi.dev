import { readFileSync } from 'node:fs';

// The private token stays on the server; never put it in an embedded widget.
const [method='GET',path='/admin/content',filename]=process.argv.slice(2);
if(!/^(GET|PUT|POST|DELETE)$/.test(method)||!path.startsWith('/admin/')||/[\r\n]/.test(path)) throw new Error('用法：npm run admin -- GET /admin/content');
const host=process.env.HOST==='0.0.0.0'?'127.0.0.1':process.env.HOST??'127.0.0.1';
const url=`http://${host}:${process.env.PORT??4318}${path}`;
const body=filename?readFileSync(filename):undefined;
const image=path==='/admin/assets';
const extension=filename?.split('.').at(-1)?.toLowerCase();
const mime=extension==='jpg'||extension==='jpeg'?'image/jpeg':extension==='webp'?'image/webp':'image/png';
const response=await fetch(url,{method,
  headers:{Authorization:`Bearer ${process.env.ADMIN_TOKEN??''}`,...(body?{'Content-Type':image?mime:'application/json'}:{})},
  body:body?new Uint8Array(body):undefined,
});
const text=await response.text();
if(!response.ok) {console.error(`HTTP ${response.status}: ${text}`);process.exitCode=1;}
else if(text) {try {console.log(JSON.stringify(JSON.parse(text),null,2));}catch{console.log(text);}}
else console.log(`HTTP ${response.status}`);
