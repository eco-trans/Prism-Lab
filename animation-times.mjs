export function animationTimes(start,end,currentPercent,stepMinutes=1){
 const step=Number(stepMinutes)*60;if(!(step>0)||!(end>start))return [];
 const first=currentPercent>=100?start:start+(end-start)*Math.max(0,currentPercent)/100,times=[first];
 for(let t=first+step;t<end;t+=step)times.push(t);if(first<end)times.push(end);
 return times.map(t=>(t-start)/(end-start)*100);
}
