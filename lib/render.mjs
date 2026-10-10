import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {AppError} from './config.mjs';
import {wavDuration} from './providers.mjs';
export function runProcess(executable,args,{cwd,timeout=300000}={}){return new Promise((resolve,reject)=>{
 const p=spawn(executable,args,{cwd,windowsHide:true,shell:false});let stderr='',stdout='';const timer=setTimeout(()=>{p.kill();reject(new AppError('A renderização excedeu o tempo permitido.',504));},timeout);
 p.stderr.on('data',b=>{stderr=(stderr+b.toString()).slice(-20000);});p.stdout.on('data',b=>{stdout=(stdout+b.toString()).slice(-20000);});
 p.once('error',()=>{clearTimeout(timer);reject(new AppError('FFmpeg não está instalado ou acessível.',503));});p.once('close',code=>{clearTimeout(timer);if(code===0)resolve({stdout,stderr});else reject(new AppError('Não foi possível renderizar o vídeo. Verifique áudio, imagens e instalação do FFmpeg.',502));});
});}
export async function resolveFFmpeg(config){if(config.ffmpeg&&config.ffmpeg!=='ffmpeg')return config.ffmpeg;try{const module=await import('@ffmpeg-installer/ffmpeg');return module.default.path;}catch{return 'ffmpeg';}}
export async function ensureRenderer(config){const exe=await resolveFFmpeg(config);await runProcess(exe,['-version'],{timeout:10000});return exe;}
export function assTime(seconds){const cs=Math.max(0,Math.round(seconds*100));return `${Math.floor(cs/360000)}:${String(Math.floor(cs/6000)%60).padStart(2,'0')}:${String(Math.floor(cs/100)%60).padStart(2,'0')}.${String(cs%100).padStart(2,'0')}`;}
export function buildAss(words,style,duration){
 const color=style==='Destaque vermelho'?'&H003939FF':style==='Impacto'?'&H0032D8FF':'&H00FFFFFF';const size=style==='Suave'?64:style==='Impacto'?90:80;
 let text=`[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,${size},${color},${color},&H00000000,&H80000000,${style==='Suave'?0:-1},${style==='Impacto'?-1:0},0,0,100,100,0,0,1,${style==='Suave'?2:5},2,2,70,70,430,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
 if(style==='Sem legenda')return text;
 for(const w of words){const start=Math.max(0,w.start),end=Math.min(duration,w.end);if(end<=start)continue;let value=w.word.replace(/[{}\\\r\n]/g,'').trim();if(style!=='Impacto'&&style!=='Suave')value=value.toLocaleUpperCase();if(value)text+=`Dialogue: 0,${assTime(start)},${assTime(end)},Default,,0,0,0,,${value}\n`;}
 return text;
}
export async function normalizeNarration(config,source,destination,target){const duration=wavDuration(await readFile(source));const ratio=duration/target;if(ratio<0.5||ratio>2)throw new AppError('A narração ficou fora da duração escolhida. Gere um novo vídeo.',502);const exe=await resolveFFmpeg(config);await runProcess(exe,['-y','-v','error','-i',source,'-af',`atempo=${ratio.toFixed(6)},apad`,'-t',String(target),'-ar','24000','-ac','1','-c:a','pcm_s16le',destination]);return target;}
export async function renderVideo(config,{directory,images,audio,words,caption,duration,musicPath}){
 const exe=await resolveFFmpeg(config),fps=30;
 const totalFrames=Math.round(duration*fps),perImage=Math.floor(totalFrames/images.length);let used=0;
 for(let i=0;i<images.length;i++){
  const frames=i===images.length-1?totalFrames-used:perImage;used+=frames;
  await runProcess(exe,['-y','-v','error','-loop','1','-i',images[i],'-vf',`scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,zoompan=z='min(zoom+0.0004,1.06)':d=1:s=1080x1920:fps=30`,'-frames:v',String(frames),'-an','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p',path.join(directory,`clip-${i}.mp4`)]);
 }
 await writeFile(path.join(directory,'concat.txt'),images.map((_,i)=>`file 'clip-${i}.mp4'`).join('\n'));
 await writeFile(path.join(directory,'captions.ass'),buildAss(words,caption,duration));
 const args=['-y','-v','error','-f','concat','-safe','1','-i','concat.txt','-i',audio];
 if(musicPath)args.push('-stream_loop','-1','-i',musicPath,'-filter_complex','[2:a]volume=0.12[m];[1:a][m]amix=inputs=2:duration=first:normalize=0[a]','-map','0:v:0','-map','[a]');else args.push('-map','0:v:0','-map','1:a:0');
 if(caption!=='Sem legenda')args.push('-vf','ass=captions.ass');
 args.push('-c:v',caption==='Sem legenda'?'copy':'libx264');if(caption!=='Sem legenda')args.push('-preset','veryfast','-crf','22');
 args.push('-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart','video.mp4');await runProcess(exe,args,{cwd:directory});
 return path.join(directory,'video.mp4');
}
