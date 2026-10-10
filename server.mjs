import http from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=path.join(root,'data');
await mkdir(dataDir,{recursive:true});
let series=[];
try {series=JSON.parse(await readFile(path.join(dataDir,'series.json'),'utf8'));} catch(e) {if(e.code!=='ENOENT')throw e;}
let saving=Promise.resolve();
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/series'&&req.method==='GET')return json(res,200,series);
  if(url.pathname==='/api/series'&&req.method==='POST'){
   if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'Origem inválida.'});
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>20000)return json(res,413,{error:'Dados muito grandes.'});}
   let s;try{s=JSON.parse(raw);}catch{return json(res,400,{error:'Dados inválidos.'});}
   if(typeof s.name!=='string'||!s.name.trim()||s.name.length>100||typeof s.niche!=='string'||!s.niche.trim()||s.niche.length>5000||!['pt-BR','en-US','es'].includes(s.language)||!['Rafael','Heitor','Vicente','Bianca','Clara'].includes(s.voice)||!['Scary story','Medieval','Pixel art','Storytime','Xilogravura','Graphic novel','Animação 3D','Polaroid','Astrofotografia'].includes(s.visual)||!['Traço forte','Destaque vermelho','Suave','Impacto','Sem legenda'].includes(s.caption)||!['30 a 40 segundos','60 a 70 segundos'].includes(s.duration))return json(res,400,{error:'Complete os detalhes da série.'});
   const item={id:randomUUID(),name:s.name.trim(),niche:s.niche,example:String(s.example||'').slice(0,2000),language:s.language,voice:s.voice,music:Array.isArray(s.music)?s.music.filter(x=>typeof x==='string').slice(0,6):[],visual:s.visual,caption:s.caption,duration:s.duration,createdAt:new Date().toISOString()};
   const saved=saving.catch(()=>{}).then(async()=>{
    const next=[...series,item];
    await writeFile(path.join(dataDir,'series.tmp'),JSON.stringify(next,null,2));
    await rename(path.join(dataDir,'series.tmp'),path.join(dataDir,'series.json'));
    series=next;
   });
   saving=saved;await saved;return json(res,201,item);
  }
  if(url.pathname.startsWith('/api/'))return json(res,503,{error:'Esta integração ainda não está configurada. A geração de vídeos, prévias, suporte e assinatura exigem os serviços do projeto.'});
  if(req.method!=='GET')return json(res,405,{error:'Método não permitido.'});
  const requested=['/app.js','/style.css'].includes(url.pathname)?url.pathname.slice(1):'index.html';
  res.writeHead(200,{'Content-Type':requested.endsWith('.js')?'text/javascript; charset=utf-8':requested.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' https://autoshortz.com; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'"});
  res.end(await readFile(path.join(root,'public',requested)));
 }catch{json(res,500,{error:'Não foi possível concluir a operação.'});}
});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('Prévia local: http://127.0.0.1:4173/dashboard/create'));
