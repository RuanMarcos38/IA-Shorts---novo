const niches=[['Medieval','História medieval real: reis, cercos e traições, com peso de crônica.',true],['Terror','Histórias de terror originais, inventadas do zero a cada vídeo.',true],['True crime','Casos reais e documentados, contados com frieza e respeito.'],['Mitologia','Deuses, monstros e escolhas com preço alto, além do óbvio.'],['E se...','Cenários hipotéticos levados a sério, com consequências reais.',true],['Histórias bíblicas','As narrativas do texto com peso dramático, sem sermão.'],['Espaço e universo','Escala cósmica traduzida em comparações que desestabilizam.'],['Estoicismo','Filosofia prática aplicada a um problema moderno por vez.']];
const voices=[['Rafael','Masculina','Grave e contido, feito para narração de suspense.'],['Heitor','Masculina','Sussurrado e próximo, arrepia em terror e folclore.'],['Vicente','Masculina','Narrador preciso, tom de documentário para true crime.'],['Bianca','Feminina','Tom de suspense, feita para terror e true crime.'],['Clara','Feminina','Viva e expressiva, boa para e se e espaço.']];
const music=[['Melodia sinistra','Assombrada e inquietante'],['Piano de terror','Teclas escuras e arrepiantes'],['Mistério sem solução','Atmosfera de suspense e intriga'],['8-bit lento','Chiptune sombrio com clima retrô'],['Calmaria antes da tempestade','Tensão crescente para revelações dramáticas'],['Sinfonia épica','Orquestral e majestosa para grandes histórias']];
const visuals=[['Scary story','scary_story'],['Medieval','medieval'],['Pixel art','pixel_art'],['Storytime','storytime'],['Xilogravura','xilogravura'],['Graphic novel','graphic_novel'],['Animação 3D','animacao_3d'],['Polaroid','polaroid'],['Astrofotografia','astrofotografia']];
const captions=['Traço forte','Destaque vermelho','Suave','Impacto','Sem legenda'];
const titles=['Escolha seu nicho','Idioma e voz','Música de fundo','Estilo visual','Estilo de legenda','Detalhes da série'];
const subtitles=['Selecione um preset ou descreva seu próprio nicho','Escolha o idioma e a voz que vão narrar seus vídeos','Escolha quantas quiser — uma delas é sorteada para cada vídeo','Escolha o estilo das imagens dos seus vídeos','Escolha como as legendas aparecem nos seus vídeos','Dê um nome à série e escolha a duração dos vídeos'];
const content=document.querySelector('#content'),breadcrumb=document.querySelector('#breadcrumb');
let step=0,nicheMode='preset',musicMode='library',busy=false,items=[];
const draft={name:'',niche:'',customNiche:'',example:'',language:'pt-BR',voice:'',music:[],visual:'',caption:'',duration:'30 a 40 segundos'};
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notice=text=>{document.querySelector('#notice-text').textContent=text;document.querySelector('#notice').showModal();};
async function api(url,options){const r=await fetch(url,options);const data=await r.json();if(!r.ok)throw Error(data.error||'Não foi possível concluir a operação.');return data;}
async function integration(path){try{await api('/api/'+path,{method:'POST'});}catch(e){notice(e.message);}}
const field=(label,id,value,options='')=>`<label class="form-field"><span>${label}</span><input id="${id}" value="${esc(value)}" ${options}></label>`;
function tabs(labels,current,action){return `<div class="tabs">${labels.map(([id,name])=>`<button class="${id===current?'active':''}" data-${action}="${id}">${name}</button>`).join('')}</div>`;}
function valid(){return step===0?!!(nicheMode==='preset'?draft.niche:draft.customNiche.trim()):step===1?!!draft.voice:step===3?!!draft.visual:step===4?!!draft.caption:step===5?!!draft.name.trim():true;}
function wizard(){
 let body='';
 if(step===0){body=tabs([['preset','Presets'],['custom','Personalizado']],nicheMode,'niche-mode');body+=nicheMode==='preset'?`<div class="choices">${niches.map(([n,d,t])=>`<button class="choice ${draft.niche===n?'selected':''}" role="checkbox" aria-checked="${draft.niche===n}" data-niche="${esc(n)}"><strong>${n}</strong><small>${d}</small>${t?'<span class="trending">↗ &nbsp; Em alta agora</span>':''}</button>`).join('')}</div>`:`<label class="form-field"><span>Nicho</span><textarea id="custom-niche" maxlength="5000">${esc(draft.customNiche)}</textarea><span class="help"><span>Descreva seu tema</span><span id="niche-count">${draft.customNiche.length} / 5000</span></span></label><label class="form-field"><span>Roteiro de exemplo <small>Opcional</small></span><textarea id="example-script" maxlength="2000">${esc(draft.example)}</textarea><span class="help"><span>A IA vai seguir esse estilo e tom</span><span id="example-count">${draft.example.length} / 2000</span></span></label>`;}
 if(step===1)body=`<label class="form-field"><span>Idioma</span><select id="language">${[['pt-BR','🇧🇷 Português (Brasil)'],['en-US','🇺🇸 English (US)'],['es','🇪🇸 Español']].map(([v,n])=>`<option value="${v}" ${draft.language===v?'selected':''}>${n}</option>`).join('')}</select></label><p>Voz</p><div class="voice-grid">${voices.map(([n,g,d])=>`<div class="card-wrap"><button class="choice ${draft.voice===n?'selected':''}" role="radio" aria-checked="${draft.voice===n}" aria-label="Selecionar voz ${n}" data-voice="${n}"><strong>${n}<span class="gender">${g}</span></strong><small>${d}</small></button><button class="preview" data-preview="voice/${n}" aria-label="Ouvir prévia de ${n}">▷</button></div>`).join('')}</div>`;
 if(step===2){body=tabs([['library','Músicas prontas'],['custom','Personalizada']],musicMode,'music-mode');body+=musicMode==='library'?`<div class="choices music">${music.map(([n,d])=>`<div class="card-wrap"><button class="choice ${draft.music.includes(n)?'selected':''}" role="checkbox" aria-checked="${draft.music.includes(n)}" data-music="${esc(n)}"><strong>${n}</strong><small>${d}</small></button><button class="preview" data-preview="music/${encodeURIComponent(n)}" aria-label="Ouvir prévia de ${n}">▷</button></div>`).join('')}</div>`:`<label class="upload form-field"><strong>Enviar arquivos de áudio</strong><p>Suas músicas tocam no lugar da biblioteca. Se enviar várias, uma toca por vídeo.</p><p>Clique para enviar ou arraste os arquivos<br>MP3, WAV até 10 MB</p><input type="file" id="music-files" accept="audio/mpeg,audio/wav" multiple></label>`;}
 if(step===3)body=`<div class="style-grid">${visuals.map(([n,file])=>`<button class="visual ${draft.visual===n?'selected':''}" role="checkbox" aria-checked="${draft.visual===n}" data-visual="${n}"><img src="https://autoshortz.com/styles/${file}.jpg" alt="${n}"><span>${n}</span></button>`).join('')}</div>`;
 if(step===4)body=`<div class="caption-grid">${captions.map((n,i)=>`<button class="caption-card ${draft.caption===n?'selected':''}" role="checkbox" aria-checked="${draft.caption===n}" data-caption="${n}"><div class="caption-preview ${['','red','soft','impact','clean'][i]}">${i===4?'vídeo limpo':i===3?'você':'VOCÊ'}</div><span>${n}</span></button>`).join('')}</div>`;
 if(step===5)body=field('Nome da série','series-name',draft.name,'maxlength="100"')+`<label class="form-field"><span>Duração dos vídeos</span><select id="duration">${['30 a 40 segundos','60 a 70 segundos'].map(n=>`<option ${draft.duration===n?'selected':''}>${n}</option>`).join('')}</select></label><div class="info">Sua série vai propor um novo tema no seu ritmo. Você lê o título, clica em <strong>Gerar vídeo</strong> e baixa o resultado — nada é produzido sem você mandar gerar.</div>`;
 breadcrumb.innerHTML='<a href="/dashboard">Séries</a><span>›</span> Criar nova série';
 content.innerHTML=`<section class="wizard"><div class="progress" aria-label="Etapa ${step+1} de 6">${titles.map((_,i)=>`<i class="${i<=step?'done':''}"></i>`).join('')}</div><div class="title"><h1>${titles[step]}</h1><span class="step-badge">Etapa ${step+1} de 6</span>${step===2?'<span class="step-badge">Opcional</span>':''}</div><p class="subtitle">${subtitles[step]}</p>${body}<p class="error" role="alert" id="error"></p><div class="actions">${step?'<button id="back">Voltar</button>':''}<button class="next" id="next" ${valid()&&!busy?'':'disabled'}>${busy?'Criando…':step===5?'Criar série':step===2&&!draft.music.length?'Pular':'Continuar'}</button></div></section>`;
 bindWizard();
}
function bindWizard(){
 const bind=(selector,fn)=>content.querySelectorAll(selector).forEach(el=>el.addEventListener('click',()=>fn(el)));
 bind('[data-niche-mode]',el=>{nicheMode=el.dataset.nicheMode;wizard();});
 bind('[data-music-mode]',el=>{musicMode=el.dataset.musicMode;wizard();});
 for(const key of ['niche','voice','visual','caption'])bind(`[data-${key}]`,el=>{draft[key]=el.dataset[key];wizard();});
 bind('[data-music]',el=>{const n=el.dataset.music;draft.music=draft.music.includes(n)?draft.music.filter(x=>x!==n):[...draft.music,n];wizard();});
 bind('[data-preview]',el=>integration('preview/'+el.dataset.preview));
 for(const [id,key]of [['custom-niche','customNiche'],['example-script','example'],['series-name','name'],['duration','duration'],['language','language']]){
  const el=document.getElementById(id);if(el)el.addEventListener('input',()=>{draft[key]=el.value;document.getElementById('next').disabled=!valid();if(id==='custom-niche')document.getElementById('niche-count').textContent=el.value.length+' / 5000';if(id==='example-script')document.getElementById('example-count').textContent=el.value.length+' / 2000';});
 }
 const files=document.getElementById('music-files');if(files)files.addEventListener('change',()=>{const invalid=[...files.files].some(f=>f.size>10*1024*1024||!(/\.(mp3|wav)$/i.test(f.name)));notice(invalid?'Envie arquivos MP3 ou WAV com até 10 MB.':'O armazenamento de áudio ainda precisa ser conectado para salvar seus arquivos.');files.value='';});
 document.getElementById('back')?.addEventListener('click',()=>{step--;wizard();window.scrollTo(0,0);});
 document.getElementById('next').addEventListener('click',async()=>{
  if(!valid()||busy)return;
  if(step<5){step++;wizard();window.scrollTo(0,0);return;}
  busy=true;document.getElementById('next').disabled=true;
  try{await api('/api/series',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,niche:nicheMode==='custom'?draft.customNiche:draft.niche})});step=0;history.pushState({},'', '/dashboard');await render();}catch(e){document.getElementById('error').textContent=e.message;}finally{busy=false;if(document.getElementById('next'))document.getElementById('next').disabled=!valid();}
 });
}
async function render(){
 const route=location.pathname;
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.pathname===route||(route==='/dashboard/create'&&a.pathname==='/dashboard')));
 if(route==='/dashboard/create'||route==='/'){wizard();return;}
 breadcrumb.innerHTML='';
 if(route==='/dashboard'){
  try{items=await api('/api/series');}catch(e){notice(e.message);return;}
  if(!items.length){history.replaceState({},'','/dashboard/create');wizard();return;}
  content.innerHTML=`<section class="page"><div class="page-heading"><h1>Séries</h1><a class="link-button" href="/dashboard/create">Criar nova série</a></div><div class="series-list">${items.map(s=>`<article class="section"><h2>${esc(s.name)}</h2><p class="subtitle">${esc(s.niche)} · ${esc(s.voice)} · ${esc(s.duration)}</p><button data-generate="${s.id}">Gerar vídeo</button></article>`).join('')}</div></section>`;
  content.querySelectorAll('[data-generate]').forEach(b=>b.addEventListener('click',()=>integration('generate/'+b.dataset.generate)));return;
 }
 if(route==='/dashboard/videos'){content.innerHTML='<section class="page"><div class="page-heading"><h1>Vídeos</h1><a class="link-button" href="/dashboard">Minhas séries</a></div></section>';return;}
 if(route==='/dashboard/guides'){content.innerHTML='<section class="page"><h1>Guias</h1><p class="subtitle">Aprenda a extrair o máximo do AutoShortz — do primeiro vídeo aos primeiros resultados.</p><button class="guide" id="guide"><small>COMECE POR AQUI</small><h2>Criando seu primeiro vídeo na AutoShortz</h2><p>Do cadastro ao primeiro vídeo gerado: criar sua série, escolher nicho, voz e estilo, e entender o ritmo de novos vídeos todos os dias.</p>Assistir &nbsp; 7 min</button><h2>Todos os guias</h2><p class="subtitle">novos guias toda semana</p></section>';document.getElementById('guide').onclick=()=>notice('O vídeo do guia original ainda não foi incorporado.');return;}
 if(route==='/dashboard/settings'){content.innerHTML='<section class="page"><h1>Configurações</h1><div class="section"><h2>Minha conta</h2><p>Nome:</p><p>Email:</p><h3>Acesso</h3><p>Você entra com sua conta Google. Nenhuma senha é guardada aqui — o acesso é gerenciado pela sua conta Google.</p></div><div class="section"><h2>Assinatura</h2><p>A autenticação e a assinatura ainda precisam ser conectadas.</p></div></section>';return;}
 if(route==='/dashboard/contato'){content.innerHTML=`<section class="page contact"><h1>Fale Conosco</h1><p class="subtitle">Dúvidas, problemas ou sugestões? Escreva pra gente aqui mesmo.</p><form id="contact">${field('NOME','name','','required')}${field('EMAIL','email','','type="email" required')}${field('ASSUNTO','subject','','required')}<label class="form-field"><span>MENSAGEM</span><textarea id="message" required></textarea></label><button type="submit">Enviar mensagem</button></form><h2>Suas conversas</h2><p class="subtitle">Você ainda não tem conversas.</p></section>`;document.getElementById('contact').onsubmit=e=>{e.preventDefault();integration('contact');};return;}
 content.innerHTML='<section class="page"><h1>Página não encontrada</h1><a href="/dashboard">Séries</a></section>';
}
document.getElementById('close-notice').onclick=()=>document.getElementById('notice').close();
document.getElementById('upgrade').onclick=()=>integration('billing');
document.getElementById('logout').onclick=()=>integration('auth/logout');
document.addEventListener('click',e=>{const a=e.target.closest('a');if(a&&a.origin===location.origin){e.preventDefault();history.pushState({},'',a.pathname);render();window.scrollTo(0,0);}});
window.addEventListener('popstate',render);
render();
