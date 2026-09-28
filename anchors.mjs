import {time} from './engine.mjs';
export function clockSeconds(t){return `${String(Math.floor(t/3600)).padStart(2,'0')}:${String(Math.floor(t/60)%60).padStart(2,'0')}:${String(Math.round(t)%60).padStart(2,'0')}`}
export function normalizeAnchors(anchors){
 if(anchors.length<2||anchors.length>12)throw Error('Use between 2 and 12 ordered anchors.');
 const result=anchors.map((a,i)=>{
  const lon=Number(a.lon),lat=Number(a.lat),duration=Number(a.stayMinutes)*60;
  if(a.lon===''||a.lat===''||!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>85)throw Error(`Anchor ${i+1}: enter valid coordinates.`);
  if(!a.stayStart)throw Error(`Anchor ${i+1}: enter a stay start time.`);
  const start=time(a.stayStart);
  if(a.stayMinutes===''||!Number.isFinite(duration)||duration<0||duration>10800)throw Error(`Anchor ${i+1}: stay must be 0–180 minutes.`);
  return {...a,label:String(a.label||`Anchor ${i+1}`),lon,lat,start,duration,endTime:clockSeconds(start+duration)};
 });
 for(let i=1;i<result.length;i++)if(result[i].start<result[i-1].start+result[i-1].duration)throw Error(`Anchor ${i+1} starts before anchor ${i}'s stay ends. Reorder anchors or adjust their times.`);
 const span=result.at(-1).start+result.at(-1).duration-result[0].start;
 if(span<=0||span>10800)throw Error('The first start to final stay end must span more than 0 and at most 180 minutes.');
 return result;
}
