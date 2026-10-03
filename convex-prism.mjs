import {prepareSlices} from './slice.mjs';
// Star-shaped cross sections retain directional branches; unlike a global hull,
// each ring is computed only from positions feasible at that instant.
export function sliceEnvelope(g, sectors=96) {
 const points=g.segments.flat().concat(g.vehicles,g.activities||[]);
 if(!points.length)return null;
 let minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;
 for(const p of points){minx=Math.min(minx,p[0]);maxx=Math.max(maxx,p[0]);miny=Math.min(miny,p[1]);maxy=Math.max(maxy,p[1])}
 const cx=(minx+maxx)/2,cy=(miny+maxy)/2,scale=Math.cos(cy*Math.PI/180),step=2*Math.PI/sectors,radii=new Float64Array(sectors);
 const polar=p=>{const x=(p[0]-cx)*scale,y=p[1]-cy;return [Math.atan2(y,x),Math.hypot(x,y)]};
 const mark=(a,b)=>{let [aa,ra]=polar(a),[ab,rb]=polar(b);if(ra<1e-12)aa=ab;if(rb<1e-12)ab=aa;if(ra>1e-12&&rb>1e-12&&Math.abs(Math.sin(ab-aa))<1e-10&&Math.cos(ab-aa)<0){mark(a,a);mark(b,b);return}while(ab-aa>Math.PI)ab-=2*Math.PI;while(ab-aa < -Math.PI)ab+=2*Math.PI;const lo=Math.floor(Math.min(aa,ab)/step),hi=Math.floor(Math.max(aa,ab)/step),r=Math.max(ra,rb);for(let i=lo;i<=hi;i++){const k=(i%sectors+sectors)%sectors;radii[k]=Math.max(radii[k],r)}};
 for(const [a,b] of g.segments)mark(a,b);
 for(const p of g.vehicles.concat(g.activities||[]))mark(p,p);
 // Both ends of each angular sector bound its complete segment portions.
 // The secant factor keeps the polygon edge outside the sector's radius.
 return Array.from({length:sectors},(_,i)=>{const r=Math.max(radii[(i+sectors-1)%sectors],radii[i])/Math.cos(step/2),a=i*step;return [cx+r*Math.cos(a)/scale,cy+r*Math.sin(a)]});
}
export function convexPrism(result,roads,color){
 const get=prepareSlices(result,roads),times=new Set([result.start,result.end]);
 for(let n=0;n<=60;n++)times.add(result.start+(result.end-result.start)*n/60);
 for(const a of result.anchors){times.add(a.start);times.add(a.start+a.duration)}
 const trace={type:'mesh3d',x:[],y:[],z:[],i:[],j:[],k:[],color,opacity:.38,flatshading:false,hovertemplate:'Time: %{z:.1f} min after departure<extra></extra>',showlegend:false,name:'Time-sliced envelope',lighting:{ambient:.7,diffuse:.65,specular:.1,roughness:.9}};
 let previous=null;
 const tri=(a,b,c)=>{trace.i.push(a);trace.j.push(b);trace.k.push(c)};
 for(const t of [...times].filter(t=>t>=result.start&&t<=result.end).sort((a,b)=>a-b)){
  const ring=sliceEnvelope(get(t));if(!ring){previous=null;continue}const offset=trace.x.length;
  for(const p of ring){trace.x.push(p[0]);trace.y.push(p[1]);trace.z.push((t-result.start)/60)}
  if(previous!==null)for(let i=0;i<ring.length;i++){const next=(i+1)%ring.length;tri(previous+i,offset+i,offset+next);tri(previous+i,offset+next,previous+next)}
  else for(let i=1;i<ring.length-1;i++)tri(offset,offset+i,offset+i+1);
  previous=offset;
 }
 if(previous!==null)for(let i=1;i<95;i++)tri(previous,previous+i+1,previous+i);
 return trace;
}
