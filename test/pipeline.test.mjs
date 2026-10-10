import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createProviders,pcmToWav,wavDuration} from '../lib/providers.mjs';
import {buildAss,resolveFFmpeg,runProcess} from '../lib/render.mjs';
import {createJobManager} from '../lib/jobs.mjs';
async function cleanTemp(root){const resolved=path.resolve(root),base=path.resolve(os.tmpdir());assert.equal(path.dirname(resolved),base);assert.ok(path.basename(resolved).startsWith('ia-shorts-'));await rm(resolved,{recursive:true,force:true});}
const config={geminiKey:'test-secret',falKey:'test-secret',groqKey:'test-secret',ffmpeg:'ffmpeg',textModel:'gemini-3.8-flash',ttsModel:'gemini-3.8-flash-tts',imageModel:'fal-ai/flux/schnell',groqModel:'whisper-large-v3',voices:{Rafael:'Algenib'}};
const series={id:'series-test',name:'Verificação',niche:'História',language:'pt-BR',voice:'Rafael',visual:'Medieval',caption:'Traço forte',duration:'30 a 40 segundos',music:[]};
test('Áudio inválido e legendas com comandos não passam silenciosamente',()=>{
 const audio=pcmToWav(Buffer.alloc(24000*2));assert.equal(wavDuration(audio),1);assert.throws(()=>wavDuration(audio.subarray(0,50)));
 const subtitle=buildAss([{word:'{\\pos(0,0)}Olá',start:0,end:1}], 'Traço forte',0.5);assert.ok(!subtitle.includes('{\\pos'));assert.match(subtitle,/0:00:00\.50/);assert.ok(!buildAss([{word:'Olá',start:0,end:1}],'Sem legenda',1).includes('Dialogue:'));
});
test('Falha externa retorna erro seguro sem vazar resposta ou chave',async()=>{
 const providers=createProviders(config,{fetchFn:async()=>new Response(JSON.stringify({error:'test-secret'}),{status:429})});await assert.rejects(providers.script(series),e=>e.message.includes('limite de uso')&&!e.message.includes('test-secret'));
});
test('Gemini usa JSON estruturado e rejeita roteiro incompleto',async()=>{
 let payload;const providers=createProviders(config,{fetchFn:async(url,options)=>{payload=JSON.parse(options.body);return Response.json({candidates:[{content:{parts:[{text:'{"title":"Só título"}'}]}}]});}});
 await assert.rejects(providers.script(series),/não está completo/);assert.equal(payload.generationConfig.responseFormat.text.mimeType,'application/json');
});
test('Sem chave, a fila não chama provedores nem cobra geração',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'ia-shorts-'));try{let calls=0;const manager=await createJobManager(root,{...config,falKey:''},{providers:{script:async()=>{calls++;}},preflight:async()=>{calls++;}});await assert.rejects(manager.enqueue(series),/fal.ai/);assert.equal(calls,0);assert.deepEqual(manager.list(),[]);}finally{await cleanTemp(root);}
});
test('Pipeline renderiza MP4 com narração e legenda, persiste e impede duplicação',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'ia-shorts-render-'));try{
  let release;const gate=new Promise(resolve=>{release=resolve;});
  const pcm=Buffer.alloc(24000*2*0.4);for(let i=0;i<pcm.length/2;i++)pcm.writeInt16LE(Math.round(Math.sin(i/24000*2*Math.PI*440)*1000),i*2);
  const providers={script:async()=>{await gate;return {title:'Vídeo de verificação',narration:'Olá mundo',targetDuration:0.4,scenes:Array.from({length:4},()=>({prompt:'Cena sólida de teste'}))};},speech:async(text,s,destination)=>writeFile(destination,pcmToWav(pcm)),image:async(prompt,destination)=>{const pixels=Buffer.alloc(32*64*3);for(let i=0;i<pixels.length;i+=3){pixels[i]=32;pixels[i+1]=20;pixels[i+2]=100;}await writeFile(destination,Buffer.concat([Buffer.from('P6\n32 64\n255\n'),pixels]));},transcribe:async()=>[{word:'Olá',start:0,end:0.18},{word:'mundo',start:0.18,end:0.4}]};
  const manager=await createJobManager(root,config,{providers});const job=await manager.enqueue(series);await assert.rejects(manager.enqueue(series),/já tem um vídeo/);release();await manager.idle();assert.equal(manager.get(job.id).status,'ready',manager.get(job.id).error);
  const file=path.join(root,'data','videos',job.id,'video.mp4'),bytes=await readFile(file);assert.equal(bytes.toString('ascii',4,8),'ftyp');assert.ok(bytes.length>1000);
  const exe=await resolveFFmpeg(config);await runProcess(exe,['-v','error','-i',file,'-f','null','-']);
  const restarted=await createJobManager(root,config,{providers});assert.equal(restarted.get(job.id).status,'ready');assert.match(restarted.get(job.id).url,/\/video\.mp4$/);
 }finally{await cleanTemp(root);}
});
test('Uma falha de provedor não é marcada como vídeo concluído',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'ia-shorts-fail-'));try{const manager=await createJobManager(root,config,{providers:{script:async()=>{throw Error('sensitive remote payload');}},preflight:async()=>{}});const job=await manager.enqueue(series);await manager.idle();assert.equal(manager.get(job.id).status,'failed');assert.equal(manager.get(job.id).url,null);assert.ok(!manager.get(job.id).error.includes('sensitive'));}finally{await cleanTemp(root);}
});
