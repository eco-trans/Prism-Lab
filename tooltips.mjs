export function installTooltips(){
 const tip=document.createElement('div');tip.id='cursor-tooltip';tip.className='cursor-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);
 let target=null;
 function hide(){target?.removeAttribute('aria-describedby');target=null;tip.hidden=true}
 function show(node,x,y){if(!node){hide();return}if(target!==node){hide();target=node;tip.textContent=node.dataset.tooltip;node.setAttribute('aria-describedby',tip.id)}tip.hidden=false;const w=tip.offsetWidth,h=tip.offsetHeight;tip.style.left=Math.max(8,Math.min(x+14,innerWidth-w-8))+'px';tip.style.top=Math.max(8,y+18+h>innerHeight?y-h-12:y+18)+'px'}
 document.addEventListener('pointermove',e=>show(e.target.closest?.('[data-tooltip]'),e.clientX,e.clientY));
 document.addEventListener('focusin',e=>{const node=e.target.closest?.('[data-tooltip]');if(node&&target!==node){const r=node.getBoundingClientRect();show(node,r.left,r.bottom)}});
 document.addEventListener('focusout',hide);document.addEventListener('scroll',hide,true);document.documentElement.addEventListener('pointerleave',hide);document.addEventListener('keydown',e=>{if(e.key==='Escape')hide()});
}
