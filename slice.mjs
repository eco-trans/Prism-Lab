import {meters} from './roads.mjs';
// Prepare fixed costs and shape distances once per calculated prism. Only
// feasible segments are retained in both views, without display sampling.
export function prepareSlices(result,roads){
 const edges=(result.roadBands||result.roadEdges.map(road=>({road}))).map(band=>{const e=roads.edges[band.road],speed=result.mode==='drive'?e[4]*+result.params.driveFactor:result.mode==='bike'?+result.params.bikeSpeed:+result.params.walkSpeed;return {from:roads.nodes[e[0]],to:roads.nodes[e[1]],cost:e[2]*3.6/speed,early:band.early??result.earliest[e[0]],late:band.late??result.latest[e[1]]}}).concat(result.connectors||[]);
 const rides=result.rides.map(r=>{const cumulative=[0];for(let i=1;i<r.path.length;i++)cumulative.push(cumulative.at(-1)+meters(r.path[i-1],r.path[i]));return {...r,cumulative}}),cache=new Map();
 return at=>{
  const key=at;if(cache.has(key))return cache.get(key);
  let count=0;for(const e of edges)if(at>=e.early&&at<=e.late&&e.early+e.cost<=e.late)count++;
  const segments=[],vehicles=[];
  for(const e of edges){if(at<e.early||at>e.late||e.early+e.cost>e.late)continue;
   const lo=e.cost?Math.max(0,(at-e.late+e.cost)/e.cost):0,hi=e.cost?Math.min(1,(at-e.early)/e.cost):1;
   const p=f=>[e.from[0]+(e.to[0]-e.from[0])*f,e.from[1]+(e.to[1]-e.from[1])*f];segments.push([p(lo),p(hi)]);
  }
  for(const r of rides){if(at<r.depart||at>r.arrive||!r.path.length)continue;const target=r.cumulative.at(-1)*(r.arrive===r.depart?0:(at-r.depart)/(r.arrive-r.depart));let i=1;while(i<r.path.length-1&&r.cumulative[i]<target)i++;if(r.path.length===1){vehicles.push(r.path[0]);continue}const a=r.path[i-1],b=r.path[i],d=r.cumulative[i]-r.cumulative[i-1],f=d?(target-r.cumulative[i-1])/d:0;vehicles.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);}
  const activities=(result.activities||(result.activity?[result.activity]:[])).filter(a=>a.feasible&&at>=a.earliestStart&&at<=a.latestEnd).map(a=>[a.lon,a.lat]);const value={segments,vehicles,count,activities};if(cache.size>=2)cache.delete(cache.keys().next().value);cache.set(key,value);return value;
 };
}
export function sliceGeometry(result,roads,at){
 const segments=[],vehicles=[];
 for(const band of result.roadBands||result.roadEdges.map(road=>({road}))){const e=roads.edges[band.road],speed=result.mode==='drive'?e[4]*+result.params.driveFactor:result.mode==='bike'?+result.params.bikeSpeed:+result.params.walkSpeed,c=e[2]*3.6/speed;
 const lo=Math.max(0,(at-(band.late??result.latest[e[1]])+c)/c),hi=Math.min(1,(at-(band.early??result.earliest[e[0]]))/c);if(lo>hi)continue;
 const a=roads.nodes[e[0]],b=roads.nodes[e[1]],p=f=>[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];segments.push([p(lo),p(hi)]);}
 for(const e of result.connectors||[]){if(e.cost===0){if(at>=e.early&&at<=e.late)segments.push([e.from,e.to]);continue}const lo=Math.max(0,(at-e.late+e.cost)/e.cost),hi=Math.min(1,(at-e.early)/e.cost);if(lo>hi)continue;const p=f=>e.from.map((x,i)=>x+(e.to[i]-x)*f);segments.push([p(lo),p(hi)]);}
 for(const r of result.rides){if(at<r.depart||at>r.arrive||!r.path.length)continue;const lengths=r.path.slice(1).map((p,i)=>meters(r.path[i],p)),total=lengths.reduce((a,b)=>a+b,0);let target=total*(r.arrive===r.depart?0:(at-r.depart)/(r.arrive-r.depart)),point=r.path.at(-1);for(let i=0;i<lengths.length;i++){if(target<=lengths[i]){const f=lengths[i]?target/lengths[i]:0,a=r.path[i],b=r.path[i+1];point=[a[0]+f*(b[0]-a[0]),a[1]+f*(b[1]-a[1])];break}target-=lengths[i]}vehicles.push(point);}
 return {segments,vehicles};
}
