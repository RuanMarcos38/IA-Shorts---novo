import http from 'node:http';
import {readFile,writeFile,mkdir,rename,stat,access} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {loadConfig,AppError} from './lib/config.mjs';
import {createJobManager} from './lib/jobs.mjs';
import {createProviders} from './lib/providers.mjs';
import {resolveFFmpeg,runProcess} from './lib/render.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=path.join(root,'data');
await mkdir(dataDir,{recursive:true});
const config=await loadConfig(root);
const jobs=await createJobManager(root,config);
const providers=createProviders(config);
const musicDir=path.join(dataDir,'music');await mkdir(musicDir,{recursive:true});
let uploads=[];try{uploads=JSON.parse(await readFile(path.join(dataDir,'music.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
let musicWrites=Promise.resolve();
async function body(req,limit=20000){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw new AppError('Dados muito grandes.',413);chunks.push(chunk);}return Buffer.concat(chunks);}
async function streamFile(req,res,file,type,attachment=false){
 const {size}=await stat(file);let start=0,end=size-1,status=200;
 if(req.headers.range){const match=req.headers.range.match(/^bytes=(\d+)-(\d*)$/);if(!match){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}status=206;}
 const headers={'Content-Type':type,'Content-Length':end-start+1,'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'};
 if(status===206)headers['Content-Range']=`bytes ${start}-${end}/${size}`;if(attachment)headers['Content-Disposition']='attachment; filename="video.mp4"';
 res.writeHead(status,headers);const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
}
let series=[];
try {series=JSON.parse(await readFile(path.join(dataDir,'series.json'),'utf8'));} catch(e) {if(e.code!=='ENOENT')throw e;}
let saving=Promise.resolve();
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host||''))return json(res,403,{error:'Servidor disponível apenas localmente.'});
  if(req.method!=='GET'&&req.method!=='HEAD'&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return json(res,403,{error:'Origem inválida.'});
  if(url.pathname==='/api/videos'&&req.method==='GET')return json(res,200,jobs.list());
  const videoRoute=url.pathname.match(/^\/api\/videos\/([0-9a-f-]{36})$/);
  if(videoRoute&&req.method==='GET'){const item=jobs.get(videoRoute[1]);return json(res,item?200:404,item||{error:'Vídeo não encontrado.'});}
  const generate=url.pathname.match(/^\/api\/generate\/([0-9a-f-]{36})$/);
  if(generate&&req.method==='POST'){
   const s=series.find(s=>s.id===generate[1]);if(!s)return json(res,404,{error:'Série não encontrada.'});
   const audio=s.music.filter(id=>uploads.some(u=>u.id===id));const chosen=audio.length?uploads.find(u=>u.id===audio[Math.floor(Math.random()*audio.length)]):null;
   return json(res,202,await jobs.enqueue(s,{musicPath:chosen?path.join(musicDir,chosen.filename):undefined}));
  }
  const media=url.pathname.match(/^\/media\/([0-9a-f-]{36})\/video\.mp4$/);
  if(media&&req.method==='GET'){const j=jobs.get(media[1]);if(!j||j.status!=='ready')return json(res,404,{error:'Vídeo não disponível.'});await streamFile(req,res,path.join(dataDir,'videos',j.id,'video.mp4'),'video/mp4',url.searchParams.get('download')==='1');return;}
  if(url.pathname==='/api/music'&&req.method==='POST'){
   if(!/^multipart\/form-data; boundary=/i.test(req.headers['content-type']||''))throw new AppError('Formato do upload inválido.');
   const bytes=await body(req,62*1024*1024);const form=await new Request('http://localhost',{method:'POST',headers:{'Content-Type':req.headers['content-type']},body:bytes}).formData();const files=form.getAll('files');
   if(!files.length||files.length>6||files.some(f=>typeof f==='string'||!(/\.(mp3|wav)$/i.test(f.name))||!f.size||f.size>10*1024*1024))throw new AppError('Envie até seis arquivos MP3 ou WAV, com até 10 MB cada.');
   const exe=await resolveFFmpeg(config);const saved=[];
   for(const file of files){const id=randomUUID(),source=path.join(musicDir,id+'.source'),filename=id+'.wav';await writeFile(source,Buffer.from(await file.arrayBuffer()));await runProcess(exe,['-y','-v','error','-i',source,'-t','180','-vn','-ar','24000','-ac','1',path.join(musicDir,filename)]);saved.push({id,name:file.name,filename});}
   const task=musicWrites.catch(()=>{}).then(async()=>{const next=[...uploads,...saved];await writeFile(path.join(dataDir,'music.json.tmp'),JSON.stringify(next,null,2));await rename(path.join(dataDir,'music.json.tmp'),path.join(dataDir,'music.json'));uploads=next;});musicWrites=task;await task;return json(res,201,saved.map(({id,name})=>({id,name})));
  }
  const voicePreview=url.pathname.match(/^\/api\/preview\/voice\/(Rafael|Heitor|Vicente|Bianca|Clara)$/);
  if(voicePreview&&req.method==='POST'){
   if(!config.geminiKey)throw new AppError('Conecte o Gemini antes de ouvir as vozes.',503);
   let settings={};try{settings=JSON.parse((await body(req)).toString()||'{}');}catch{throw new AppError('Dados inválidos.');}
   const language=['pt-BR','en-US','es'].includes(settings.language)?settings.language:'pt-BR';const voice=voicePreview[1];
   const dir=path.join(dataDir,'previews');await mkdir(dir,{recursive:true});const file=path.join(dir,voice+'-'+language+'.wav');
   try{await access(file);}catch{const text={'pt-BR':'Em cada história, um detalhe pode mudar tudo. Ouça com atenção.','en-US':'In every story, one detail can change everything. Listen closely.','es':'En cada historia, un detalle puede cambiarlo todo. Escucha con atención.'}[language];await providers.speech(text,{language,voice},file);}
   await streamFile(req,res,file,'audio/wav');return;
  }
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
  res.writeHead(200,{'Content-Type':requested.endsWith('.js')?'text/javascript; charset=utf-8':requested.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' https://autoshortz.com; style-src 'self'; script-src 'self'; connect-src 'self'; media-src 'self' blob:; base-uri 'self'; frame-ancestors 'none'"});
  res.end(await readFile(path.join(root,'public',requested)));
 }catch(e){if(res.headersSent)res.destroy();else json(res,e instanceof AppError?e.status:500,{error:e instanceof AppError?e.message:'Não foi possível concluir a operação.'});}
});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('Prévia local: http://127.0.0.1:4173/dashboard/create'));
