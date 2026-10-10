import {readFile} from 'node:fs/promises';
import path from 'node:path';
export async function loadConfig(root){
 let file='';try{file=await readFile(path.join(root,'.env.local'),'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
 const env={};for(const line of file.split(/\r?\n/)){const m=line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');}
 const get=k=>process.env[k]||env[k]||'';
 return {geminiKey:get('GEMINI_API_KEY'),falKey:get('FAL_KEY'),groqKey:get('GROQ_API_KEY'),textModel:get('GEMINI_TEXT_MODEL')||'gemini-3.8-flash',ttsModel:get('GEMINI_TTS_MODEL')||'gemini-3.8-flash-tts',imageModel:get('FAL_IMAGE_MODEL')||'fal-ai/flux/schnell',groqModel:get('GROQ_TRANSCRIPTION_MODEL')||'whisper-large-v3',ffmpeg:get('FFMPEG_PATH')||'ffmpeg',voices:{Rafael:get('VOICE_RAFAEL')||'Algenib',Heitor:get('VOICE_HEITOR')||'Enceladus',Vicente:get('VOICE_VICENTE')||'Charon',Bianca:get('VOICE_BIANCA')||'Kore',Clara:get('VOICE_CLARA')||'Aoede'}};
}
export class AppError extends Error{constructor(message,status=400){super(message);this.status=status;}}
