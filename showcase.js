'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let all=[],featured=[],selected=0,filter='All',previousFocus=null,archiveExpanded=false;
const colors=['#e0e6ee','#e6e8ed','#dde5ef','#e5e3e9','#dce3ec','#e5e8ec'];
let fanHover=null, fanFrame=0, fanCurrent=4, fanTarget=4, fanVisible=true;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');

let activePreview=null;
function previewMedia(p,lazy=true){const img=`<img src="${esc(p.image)}" alt="${esc(p.name)} interface" ${lazy?'loading="lazy"':'fetchpriority="high"'} draggable="false">`;return p.video?`<span class="preview-media">${img}<video class="preview-video" data-src="${esc(p.video)}" muted loop playsinline preload="none" aria-hidden="true"></video><span class="video-label">Video preview</span></span>`:img;}
function stopPreview(){if(activePreview){activePreview.pause();activePreview.classList.remove('is-playing');activePreview=null;}}
function playPreview(button){const video=button?.querySelector('.preview-video');if(activePreview===video)return;stopPreview();if(!video||reducedMotion.matches||navigator.connection?.saveData||document.hidden||$('#project-dialog').open)return;activePreview=video;if(!video.src)video.src=video.dataset.src;video.muted=true;video.play().then(()=>{if(activePreview===video)video.classList.add('is-playing');else video.pause();}).catch(()=>{video.classList.remove('is-playing');if(activePreview===video)activePreview=null;});}
document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const b=e.target.closest('.project-window,.card-button');if(b&&!b.contains(e.relatedTarget))playPreview(b);});
document.addEventListener('pointerout',e=>{const b=e.target.closest('.project-window,.card-button');if(b&&!b.contains(e.relatedTarget))stopPreview();});
document.addEventListener('focusin',e=>playPreview(e.target.closest('.project-window,.card-button')));
document.addEventListener('scroll',()=>{if(activePreview){const r=activePreview.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)stopPreview();}},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPreview();});
reducedMotion.addEventListener('change',stopPreview);
function caption(index){const p=featured[index];if(!p)return;$('#selected-category').textContent=p.category;$('#selected-title').textContent=p.name+' ↗';$('#selected-index').textContent=String(index+1).padStart(2,'0')+' / '+String(featured.length).padStart(2,'0');}
function layoutFan(){
 const width=$('#stage').clientWidth, cardWidth=Math.min(340,width*.62), spacing=Math.min(220,cardWidth*.65), edgeInset=cardWidth*.53+18;
 document.querySelectorAll('.project-window').forEach((el,i)=>{
  const rel=i-fanCurrent;
  const distance=Math.abs(rel), raised=fanHover===i, mobile=featured[i].category==='Mobile';
  const h=cardWidth*.67, w=cardWidth;
  el.style.width=w+'px';el.style.height=h+'px';el.style.transition=reducedMotion.matches?'none':Math.abs(fanTarget-fanCurrent)>.002?'filter .2s,box-shadow .2s':'transform .22s ease-out,filter .2s,box-shadow .2s';
  el.style.transform=`translate3d(calc(-50% + ${rel*spacing+(fanCurrent-(featured.length-1)/2)*(width-2*edgeInset)/(featured.length-1)}px),calc(-50% + ${distance*distance*4.8}px),0px) rotateY(${-rel*7}deg) scale(${1-distance*.045+(raised?.06:0)})`;
  el.style.zIndex=raised?100:Math.round(30-distance);el.classList.toggle('active',i===selected);el.classList.toggle('raised',raised);el.classList.toggle('dimmed',distance>1&&!raised);el.classList.toggle('portrait-capture',mobile);
  el.setAttribute('aria-label','Open '+featured[i].name);
 });
}
function fanTick(){
 fanFrame=0;if(!fanVisible||$('#project-dialog').open)return;
 fanCurrent+=reducedMotion.matches?fanTarget-fanCurrent:(fanTarget-fanCurrent)*.11;
 if(Math.abs(fanTarget-fanCurrent)<.002)fanCurrent=fanTarget;
 if(fanHover!==null)selected=fanHover;
 layoutFan();caption(fanHover??selected);
 if(fanCurrent!==fanTarget)fanFrame=requestAnimationFrame(fanTick);
}
function wakeFan(){if(!fanFrame)fanFrame=requestAnimationFrame(fanTick);}
function select(index){selected=Math.max(0,Math.min(featured.length-1,index));fanCurrent=fanTarget=selected;fanHover=selected;caption(selected);layoutFan();}
function renderDeck(){
 $('#deck').innerHTML=featured.map((p,i)=>`<button class="project-window" data-index="${i}" aria-label="Open ${esc(p.name)}"><span class="window-bar"><span class="window-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${esc(p.name)}</span><span aria-hidden="true">↗</span></span>${previewMedia(p,i!==0)}<span class="window-open" aria-hidden="true">↗</span></button>`).join('');
 document.querySelectorAll('.project-window').forEach((button,i)=>{
  button.addEventListener('click',()=>{if(suppressClick)return;openProject(featured[i]);});
  button.addEventListener('pointerenter',e=>{if(e.pointerType==='touch')return;selected=i;fanHover=i;caption(i);layoutFan();});
  button.addEventListener('pointerleave',()=>{if(fanHover===i){fanHover=null;caption(selected);layoutFan();}});
  button.addEventListener('focus',()=>{select(i);playPreview(button);});
  button.addEventListener('blur',()=>{fanHover=null;caption(selected);layoutFan();});
  button.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();select(selected+(e.key==='ArrowRight'?1:-1));document.querySelectorAll('.project-window')[selected].focus();}});
 });select(Math.floor(featured.length/2));
}
let touchStart=null,suppressClick=false;
$('#stage').addEventListener('pointermove',e=>{if(e.pointerType==='touch'||$('#project-dialog').open)return;const r=$('#stage').getBoundingClientRect();const inset=Math.min(340,r.width*.62)*.53+18;const nx=Math.max(0,Math.min(1,(e.clientX-r.left-inset)/(r.width-2*inset)));fanTarget=nx*(featured.length-1);fanHover=Math.round(fanTarget);selected=fanHover;caption(selected);wakeFan();},{passive:true});
$('#stage').addEventListener('pointerleave',()=>{fanHover=null;caption(selected);wakeFan();});
$('#stage').addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){touchStart={x:e.clientX,y:e.clientY};suppressClick=false;}},{passive:true});
$('#stage').addEventListener('pointerup',e=>{if(!touchStart)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)){suppressClick=true;select(selected+(dx<0?1:-1));setTimeout(()=>suppressClick=false,300);}},{passive:true});
$('#stage').addEventListener('pointercancel',()=>{touchStart=null;});
new ResizeObserver(()=>{if(featured.length)layoutFan();}).observe($('#stage'));
new IntersectionObserver(([entry])=>{fanVisible=entry.isIntersecting;if(fanVisible&&featured.length)wakeFan();}).observe($('#stage'));
reducedMotion.addEventListener('change',wakeFan);
function renderGrid(){const query=$('#search').value.toLowerCase().trim();const rows=all.filter(p=>(filter==='All'||p.category===filter)&&(p.name+' '+p.description).toLowerCase().includes(query)).sort((a,b)=>Number(!!b.image)-Number(!!a.image));const visible=filter==='All'&&!query&&!archiveExpanded?rows.slice(0,12):rows;$('#show-all-projects').hidden=visible.length===rows.length;$('#result-count').textContent=visible.length+' of '+rows.length+' projects';$('#empty').hidden=rows.length>0;$('#project-grid').innerHTML=visible.map((p,i)=>`<article class="project-card"><button class="card-button" data-id="${esc(p.id)}" aria-label="Open ${esc(p.name)}"><div class="card-visual" style="--card-bg:${colors[i%colors.length]}"><span class="card-type">${p.image?'Interface capture':esc(p.evidence)}</span>${p.image?previewMedia(p):`<span class="source-art" aria-hidden="true">${esc(p.name.split(' ').map(s=>s[0]).slice(0,2).join(''))}<small>${esc(p.evidence)}</small></span>`}<span class="card-arrow" aria-hidden="true">↗</span></div><div class="card-info"><div class="card-title-row"><h3>${esc(p.name)}</h3><span class="category">${esc(p.category)}</span></div><p>${esc(p.description)}</p></div></button></article>`).join('');document.querySelectorAll('.card-button').forEach(b=>b.addEventListener('click',()=>openProject(all.find(p=>p.id===b.dataset.id))));}
function renderFilters(){const categories=['All','Desktop','Mobile','Web','AI & automation','Creative tools','Developer tools'];$('#filters').innerHTML=categories.map(c=>`<button type="button" aria-pressed="${c===filter}" data-category="${esc(c)}">${esc(c)}</button>`).join('');$('#filters').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.category;$('#filters').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderGrid();}));}
function openProject(p){if(!p)return;stopPreview();document.body.classList.add('project-open');previousFocus=document.activeElement;$('#detail-category').textContent=p.category;$('#detail-title').textContent=p.name;$('#detail-description').textContent=p.description;$('#detail-scope').textContent=p.scope||'This project is still being documented.';$('#detail-evidence').textContent=p.evidence;$('#detail-contribution').textContent=p.contribution||p.ownership;$('#detail-story').innerHTML=[['The problem',p.problem],['The result',p.result]].filter(([,body])=>body).map(([title,body])=>`<div class="detail-section"><h3>${esc(title)}</h3><p>${esc(body)}</p></div>`).join('');$('#detail-links').innerHTML=(p.caseStudy?`<a class="text-link" href="${esc(p.caseStudy)}">Read the project story ↗</a>`:'')+(p.repo?`<a class="text-link" href="${esc(p.repo)}" target="_blank" rel="noopener">Source code ↗</a>`:'');$('#detail-media').innerHTML=p.video?`<video controls playsinline preload="metadata" poster="${esc(p.image)}" src="${esc(p.video)}"></video>`:p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)} full interface screenshot">`:`<div class="media-unavailable">${esc(p.evidence)}<small>A working interface capture is not available for this project. See the preview notes for what has been checked.</small></div>`;$('#full-image').hidden=!p.image;$('#full-image').href=p.image||'#';if(!$('#project-dialog').open)$('#project-dialog').showModal();document.body.style.overflow='hidden';$('#close-dialog').focus();}
$('#selected-title').addEventListener('click',()=>openProject(featured[fanHover??selected]));$('#search').addEventListener('input',renderGrid);$('#show-all-projects').addEventListener('click',()=>{archiveExpanded=true;renderGrid();});$('#close-dialog').addEventListener('click',()=>$('#project-dialog').close());$('#project-dialog').addEventListener('click',e=>{if(e.target===$('#project-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});$('#project-dialog').addEventListener('close',()=>{document.body.classList.remove('project-open');document.body.style.overflow='';wakeFan();$('#detail-media').querySelector('video')?.pause();previousFocus?.focus();});
fetch('projects.json?v=hiring30').then(r=>{if(!r.ok)throw new Error('Project data unavailable');return r.json();}).then(data=>{all=data.projects;featured=data.featured.map(id=>all.find(p=>p.id===id)).filter(Boolean);renderDeck();renderFilters();renderGrid();}).catch(()=>{$('#project-grid').innerHTML='<p class="loading-error">The project collection could not load. Please refresh the page or get in touch using the email link below.</p>';$('#selected-title').textContent='Preview unavailable';});
