import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {AppError} from './config.mjs';
import {createProviders} from './providers.mjs';
import {ensureRenderer,normalizeNarration,renderVideo} from './render.mjs';
export async function createJobManager(root,config,{providers=createProviders(config),renderer=renderVideo,normalize=normalizeNarration,preflight=ensureRenderer}={}){
 const folder=path.join(root,'data','videos');await mkdir(folder,{recursive:true});
 const db=path.join(root,'data','videos.json');let jobs=[];try{jobs=JSON.parse(await readFile(db,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 let writes=Promise.resolve(),queue=Promise.resolve();
 async function save(){const data=JSON.stringify(jobs,null,2);const task=writes.catch(()=>{}).then(async()=>{await writeFile(db+'.tmp',data);await rename(db+'.tmp',db);});writes=task;await task;}
 for(const job of jobs)if(!['ready','failed'].includes(job.status)){job.status='failed';job.error='O processamento foi interrompido. Gere novamente quando os serviços estiverem disponíveis.';}
 await save();
 const publicJob=j=>({id:j.id,seriesId:j.seriesId,title:j.title,status:j.status,stage:j.stage,createdAt:j.createdAt,error:j.error||null,url:j.status==='ready'?`/media/${j.id}/video.mp4`:null});
 const list=()=>jobs.map(publicJob).reverse();
 async function update(job,fields){Object.assign(job,fields);await save();}
 async function process(job,series,musicPath){
  try{
   const directory=path.join(folder,job.id);await mkdir(directory,{recursive:true});
   await update(job,{status:'processing',stage:'Roteiro'});const script=await providers.script(series);await update(job,{title:script.title,stage:'Narração'});
   await writeFile(path.join(directory,'script.json'),JSON.stringify(script,null,2));
   const source=path.join(directory,'source.wav'),audio=path.join(directory,'narration.wav');await providers.speech(script.narration,series,source);await normalize(config,source,audio,script.targetDuration);
   const images=[];for(let i=0;i<script.scenes.length;i++){await update(job,{stage:`Imagens (${i+1}/${script.scenes.length})`});const file=path.join(directory,`image-${i}.png`);await providers.image(`${script.scenes[i].prompt}. Visual style: ${series.visual}. Vertical composition, no typography, no watermarks.`,file);images.push(file);}
   let words=[];if(series.caption!=='Sem legenda'){await update(job,{stage:'Legendas'});words=await providers.transcribe(audio,series.language);}
   await update(job,{stage:'Renderização'});await renderer(config,{directory,images,audio,words,caption:series.caption,duration:script.targetDuration,musicPath});await update(job,{status:'ready',stage:'Pronto'});
  }catch(e){await update(job,{status:'failed',stage:'Falhou',error:e instanceof AppError?e.message:'O processamento falhou. Nenhum vídeo foi concluído.'});}
 }
 async function enqueue(series,{musicPath}={}){
  const missing=[];if(!config.geminiKey)missing.push('Gemini');if(!config.falKey)missing.push('fal.ai');if(series.caption!=='Sem legenda'&&!config.groqKey)missing.push('Groq');if(missing.length)throw new AppError(`Conecte ${missing.join(', ')} antes de gerar vídeos.`,503);
  if(jobs.some(j=>j.seriesId===series.id&&['queued','processing'].includes(j.status)))throw new AppError('Esta série já tem um vídeo em processamento.',409);
  if(series.music.length&&!musicPath)throw new AppError('A música selecionada ainda não tem um arquivo de áudio disponível.',503);
  await preflight(config);
  // Recheck after awaiting preflight to prevent two concurrent requests from queuing duplicates.
  if(jobs.some(j=>j.seriesId===series.id&&['queued','processing'].includes(j.status)))throw new AppError('Esta série já tem um vídeo em processamento.',409);
  const job={id:randomUUID(),seriesId:series.id,title:series.name,status:'queued',stage:'Na fila',createdAt:new Date().toISOString()};jobs.push(job);await save();
  queue=queue.catch(()=>{}).then(()=>process(job,structuredClone(series),musicPath));return publicJob(job);
 }
 return {list,enqueue,get:id=>{const j=jobs.find(j=>j.id===id);return j?publicJob(j):null;},idle:()=>queue};
}
