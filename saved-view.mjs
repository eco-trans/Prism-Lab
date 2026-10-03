import {normalizeAnchors} from './anchors.mjs';
export function saveView(result,roads,meta,view={}){
 const nodes=[],edges=[],nodeMap=new Map(),edgeMap=new Map();
 const node=id=>{if(!nodeMap.has(id)){nodeMap.set(id,nodes.length);nodes.push(roads.nodes[id])}return nodeMap.get(id)};
 for(const id of new Set([...result.roadEdges,...result.roadBands.map(b=>b.road)])){const e=roads.edges[id];edgeMap.set(id,edges.length);edges.push([node(e[0]),node(e[1]),...e.slice(2)])}
 const {earliest,latest,...r}=result;
 return {format:'prism-lab-view',version:1,meta,view,result:{...r,roadEdges:result.roadEdges.map(id=>edgeMap.get(id)),roadBands:result.roadBands.map(b=>({...b,road:edgeMap.get(b.road)}))},roads:{nodes,edges,meta:roads.meta}};
}
export function validateView(s){
 const fail=()=>{throw Error('Invalid saved view. Import a View JSON exported by Prism Lab.')};
 if(s?.format!=='prism-lab-view'||s.version!==1)fail();
 const r=s.result,g=s.roads,finite=Number.isFinite,arr=(v,max)=>Array.isArray(v)&&v.length<=max;
 const point=p=>arr(p,3)&&p.length>=2&&finite(p[0])&&finite(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=85;
 const index=(n,length)=>Number.isInteger(n)&&n>=0&&n<length;
 if(!r||!g||!arr(g.nodes,1000000)||!arr(g.edges,2500000)||!['walk','bike','drive','transit'].includes(r.mode)||!finite(r.start)||!finite(r.end)||r.end<=r.start||r.end-r.start>10800)fail();
 if(!g.nodes.every(point)||!g.edges.every(e=>arr(e,5)&&e.length===5&&index(e[0],g.nodes.length)&&index(e[1],g.nodes.length)&&e.slice(2).every(finite)&&e[2]>=0&&e[4]>0))fail();
 if(!r.params||!['walkSpeed','bikeSpeed','driveFactor'].every(k=>finite(+r.params[k])&&+r.params[k]>0))fail();
 normalizeAnchors(r.params.anchors);
 if(!arr(r.anchors,12)||r.anchors.length<2||!r.anchors.every(a=>point([a.lon,a.lat])&&finite(a.start)&&finite(a.duration)))fail();
 if(!arr(r.roadEdges,2500000)||!r.roadEdges.every(i=>index(i,g.edges.length))||!arr(r.roadBands,2500000)||!r.roadBands.every(b=>index(b.road,g.edges.length)&&finite(b.early)&&finite(b.late)))fail();
 if(!arr(r.rides,200000)||!r.rides.every(t=>finite(t.depart)&&finite(t.arrive)&&t.arrive>=t.depart&&arr(t.path,100000)&&t.path.length&&t.path.every(point)))fail();
 if(!arr(r.connectors,100000)||!r.connectors.every(c=>point(c.from)&&point(c.to)&&['cost','early','late'].every(k=>finite(c[k]))))fail();
 if(!arr(r.activities,12)||!r.activities.every(a=>point([a.lon,a.lat])&&finite(a.duration)&&(!a.feasible||['earliestStart','latestEnd'].every(k=>finite(a[k])))))fail();
 if(!arr(r.intervals,2500000)||!arr(r.stopIds,1000000)||!r.stats||typeof r.connected!=='boolean'||!finite(r.roadKm))fail();
 s.meta={agency:String(s.meta?.agency||'Saved view'),timezone:String(s.meta?.timezone||'agency local time')};
 const v=s.view||{};s.view={smoothPrism:v.smoothPrism===true,slice:finite(v.slice)?Math.max(0,Math.min(100,v.slice)):50,layers:{}};
 for(const key of ['basemap','roads','ribbons','transit'])s.view.layers[key]=key==='transit'?v.layers?.[key]===true:v.layers?.[key]!==false;
 if(v.map){if(!point([v.map.center?.[1],v.map.center?.[0]])||!finite(v.map.zoom)||v.map.zoom<1||v.map.zoom>19)fail();s.view.map={center:v.map.center,zoom:v.map.zoom}}
 if(v.camera){const c=v.camera;if(!['eye','center','up'].every(k=>c[k]&&['x','y','z'].every(a=>finite(c[k][a]))))fail();s.view.camera={eye:c.eye,center:c.center,up:c.up,projection:{type:c.projection?.type==='orthographic'?'orthographic':'perspective'}}}
 return s;
}
