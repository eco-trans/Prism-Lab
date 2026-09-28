import {clockSeconds} from './anchors.mjs';
import {time} from './engine.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createAnchorEditor(container,onChange,onPlace){
 let anchors=[],serial=0,locked=false,selected=null;
 const role=i=>i===0?'Origin':i===anchors.length-1?'Destination':'Stop';
 function summary(a,i){return `<span class="anchor-number">${i+1}</span><span class="anchor-summary"><b>${esc(a.label||role(i))}</b><span>${esc(a.stayStart)} · ${esc(a.stayMinutes)} min</span></span><span class="anchor-chevron" aria-hidden="true">⌄</span>`}
 function render(openId){
  container.innerHTML=anchors.map((a,i)=>`<details class="anchor-card" data-id="${a.id}" ${a.id===openId?'open':''}>
   <summary>${summary(a,i)}</summary><div class="anchor-role">${role(i)}</div>
   <label>Name<input form="controls" data-field="label" aria-label="Anchor ${i+1} name" value="${esc(a.label)}" maxlength="60"></label>
   <div class="pair"><label>Longitude<input form="controls" data-field="lon" aria-label="Anchor ${i+1} longitude" type="number" step="any" min="-180" max="180" value="${esc(a.lon)}" required></label><label>Latitude<input form="controls" data-field="lat" aria-label="Anchor ${i+1} latitude" type="number" step="any" min="-85" max="85" value="${esc(a.lat)}" required></label></div>
   <div class="pair"><label>Stay start<span class="time-stepper"><input form="controls" data-field="stayStart" aria-label="Anchor ${i+1} stay start" value="${esc(a.stayStart)}" pattern="[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?" data-tooltip="HH:MM or HH:MM:SS. Arrow keys change by one minute; hours above 24 are supported." required><span class="time-arrows"><button type="button" data-action="time-up" aria-label="Increase anchor ${i+1} start by one minute">▴</button><button type="button" data-action="time-down" aria-label="Decrease anchor ${i+1} start by one minute">▾</button></span></span></label><label>Stay (min)<input form="controls" data-field="stayMinutes" aria-label="Anchor ${i+1} stay minutes" type="number" min="0" max="180" step="1" value="${esc(a.stayMinutes)}" required></label></div>
   <div class="anchor-actions"><button type="button" data-action="place" aria-label="Place anchor ${i+1} on map" aria-pressed="${selected===a.id}">Place on map</button><button type="button" data-action="up" aria-label="Move anchor ${i+1} earlier" ${i===0?'disabled':''}>↑</button><button type="button" data-action="down" aria-label="Move anchor ${i+1} later" ${i===anchors.length-1?'disabled':''}>↓</button><button type="button" data-action="remove" aria-label="Remove anchor ${i+1}" ${anchors.length<=2?'disabled':''}>Remove</button></div>
  </details>`).join('');
  if(locked)for(const e of container.querySelectorAll('input,button'))e.disabled=true;
  document.getElementById('addAnchor').disabled=locked||anchors.length>=12;
 }
 function changed(){onChange()}
 function stepTime(card,delta){const a=anchors.find(a=>a.id===card.dataset.id),input=card.querySelector('[data-field="stayStart"]');let seconds;try{seconds=time(input.value)}catch{input.reportValidity();return}const value=clockSeconds(Math.max(0,Math.min(359999,seconds+delta*60)));a.stayStart=input.value=input.value.split(':').length===3?value:value.slice(0,5);card.querySelector('summary').innerHTML=summary(a,anchors.indexOf(a));changed()}
 container.addEventListener('keydown',e=>{if(!locked&&e.target.dataset.field==='stayStart'&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();stepTime(e.target.closest('[data-id]'),e.key==='ArrowUp'?1:-1)}});
 container.addEventListener('input',e=>{const key=e.target.dataset.field;if(!key)return;const card=e.target.closest('[data-id]'),a=anchors.find(a=>a.id===card.dataset.id);a[key]=e.target.value;card.querySelector('summary').innerHTML=summary(a,anchors.indexOf(a))});
 container.addEventListener('change',e=>{if(e.target.dataset.field)changed()});
 // Reveal invalid inputs even when their anchor card is collapsed.
 container.addEventListener('invalid',e=>{const card=e.target.closest('details');if(card)card.open=true},true);
 container.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(!button||locked)return;const i=anchors.findIndex(a=>a.id===button.closest('[data-id]').dataset.id),a=anchors[i],action=button.dataset.action;
  if(action==='time-up'||action==='time-down'){stepTime(button.closest('[data-id]'),action==='time-up'?1:-1);return}
  if(action==='place'){selected=selected===a.id?null:a.id;render(a.id);onPlace(selected);return}
  if(action==='remove'&&anchors.length>2)anchors.splice(i,1);
  if(action==='up'&&i>0)[anchors[i-1],anchors[i]]=[anchors[i],anchors[i-1]];
  if(action==='down'&&i<anchors.length-1)[anchors[i+1],anchors[i]]=[anchors[i],anchors[i+1]];
  selected=null;onPlace(null);render(a.id);changed();
 });
 document.getElementById('addAnchor').onclick=()=>{
  if(locked||anchors.length>=12)return;const last=anchors.at(-1),prev=anchors.at(-2);let start='08:30',stay=0;
  try{const lo=time(prev.stayStart)+Number(prev.stayMinutes)*60,hi=time(last.stayStart),gap=Math.max(0,hi-lo);stay=Math.min(10,Math.floor(gap/120));start=clockSeconds(lo+Math.floor((gap-stay*60)/120)*60).slice(0,5)}catch{}
  const a={id:`a${++serial}`,label:`Stop ${anchors.length-1}`,lon:prev.lon,lat:prev.lat,stayStart:start,stayMinutes:stay};anchors.splice(anchors.length-1,0,a);selected=null;onPlace(null);render(a.id);changed();
 };
 return {
  values(){return anchors.map(a=>({...a}))},
  reset(lon,lat){anchors=[{id:`a${++serial}`,label:'Origin',lon,lat,stayStart:'08:00',stayMinutes:0},{id:`a${++serial}`,label:'Destination',lon,lat,stayStart:'09:00',stayMinutes:0}];selected=null;render(anchors[0].id)},
  setPosition(id,lon,lat){const a=anchors.find(a=>a.id===id);if(!a)return;a.lon=lon.toFixed(6);a.lat=lat.toFixed(6);selected=null;onPlace(null);render(id);changed()},
  lock(value){locked=value;const open=container.querySelector('details[open]')?.dataset.id;render(open)},
  clearSelection(){selected=null;for(const e of container.querySelectorAll('[aria-pressed]'))e.setAttribute('aria-pressed','false')}
 };
}
