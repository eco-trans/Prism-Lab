export function readSettings(search){
 const q=new URLSearchParams(search);if(!['city','mode','date','walk','bike','drive','buffer','limit','a','t','step','view','map','roads','bands','trips'].some(k=>q.has(k)))return null;
 if(search.length>20000)throw Error('URL settings are too large');
 const s=expand(q);if(!['columbus','auburn','custom'].includes(s.city))throw Error('Unsupported URL settings');
 const f=s.fields;if(!f||!['transit','walk','bike','drive'].includes(f.mode)||!/^\d{4}-\d{2}-\d{2}$/.test(f.date))throw Error('Invalid URL travel settings');
 for(const [k,min,max] of [['walkSpeed',.1,3],['bikeSpeed',.1,12.5],['driveFactor',.1,1],['buffer',0,30],['maxWalkMinutes',0,180]]){if(k==='maxWalkMinutes'&&f[k]==='')continue;if(!Number.isFinite(+f[k])||+f[k]<min||+f[k]>max)throw Error('Invalid URL '+k)}
 if(!Array.isArray(s.anchors)||s.anchors.length<2||s.anchors.length>12)throw Error('Invalid URL anchors');
 for(const a of s.anchors){if(!Number.isFinite(+a.lon)||Math.abs(+a.lon)>180||!Number.isFinite(+a.lat)||Math.abs(+a.lat)>85||!/^\d{2}:\d{2}$/.test(a.stayStart)||!Number.isFinite(+a.stayMinutes)||+a.stayMinutes<0||+a.stayMinutes>180)throw Error('Invalid URL anchor');a.label=String(a.label||'Anchor').slice(0,100)}
 if(!Number.isFinite(+s.slice)||+s.slice<0||+s.slice>100)throw Error('Invalid URL time slice');
 if(![.25,.5,1,2,5].includes(+s.step))s.step=1;
 return s;
}

const defaults={mode:'transit',date:'2026-09-28',walkSpeed:'1.4',bikeSpeed:'4.5',driveFactor:'0.65',buffer:'2',maxWalkMinutes:''};
const keys={mode:'mode',date:'date',walkSpeed:'walk',bikeSpeed:'bike',driveFactor:'drive',buffer:'buffer',maxWalkMinutes:'limit'};
function defaultAnchors(city){const [lon,lat]=city==='auburn'?[-85.4876708984375,32.601837158203125]:[-83.0009,39.96278];return ['Origin','Destination'].map((label,i)=>({label,lon,lat,stayStart:i?'09:00':'08:00',stayMinutes:0}))}
function pack(anchors){const text=JSON.stringify(anchors.map(a=>[a.label,a.lon,a.lat,a.stayStart,a.stayMinutes]));return btoa(String.fromCharCode(...new TextEncoder().encode(text))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
function unpack(text){const bytes=Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));const a=JSON.parse(new TextDecoder().decode(bytes));if(!Array.isArray(a))throw Error('Invalid anchors');return a.map(([label,lon,lat,stayStart,stayMinutes])=>({label,lon,lat,stayStart,stayMinutes}))}
function expand(q){const city=q.get('city')||'columbus',fields={...defaults};for(const [key,param]of Object.entries(keys))if(q.has(param))fields[key]=q.get(param);return {city,fields,anchors:q.has('a')?unpack(q.get('a')):defaultAnchors(city),slice:+(q.get('t')??50),step:+(q.get('step')??1),smooth:q.get('view')==='smooth',layers:{basemap:q.get('map')!=='0',roads:q.get('roads')!=='0',ribbons:q.get('bands')!=='0',transit:q.get('trips')==='1'}}}
export function settingsURL(href,state){
 const u=new URL(href),q=u.searchParams;
 for(const k of ['prism','v','city',...Object.values(keys),'a','t','step','view','map','roads','bands','trips'])q.delete(k);
 if(state.city!=='columbus')q.set('city',state.city);
 for(const [key,param] of Object.entries(keys)){const value=String(state.fields[key]);if(value!==defaults[key])q.set(param,value)}
 const standard=defaultAnchors(state.city),same=state.anchors.length===2&&state.anchors.every((a,i)=>a.label===standard[i].label&&+a.lon===standard[i].lon&&+a.lat===standard[i].lat&&a.stayStart===standard[i].stayStart&&+a.stayMinutes===0);
 if(!same)q.set('a',pack(state.anchors));
 if(+state.slice!==50)q.set('t',String(Math.round(+state.slice*10000)/10000));if(+state.step!==1)q.set('step',String(state.step));if(state.smooth)q.set('view','smooth');
 for(const [key,param,def]of [['basemap','map',true],['roads','roads',true],['ribbons','bands',true],['transit','trips',false]]){const value=state.layers?.[key]??def;if(value!==def)q.set(param,value?'1':'0')}
 return u.href;
}
