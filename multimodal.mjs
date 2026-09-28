import {normalizeAnchors} from './anchors.mjs';
import {time,active} from './engine.mjs';
import {Heap,MODE_BITS,makeSpatialIndex,meters} from './roads.mjs';

export function prepareFeed(feed){
 const stops=new Map(feed.stops.map(s=>[s.stop_id,s]));const tripMap=new Map(feed.trips.map(t=>[t.trip_id,{...t,times:[]}])) ;
 for(const r of feed.stop_times){if(!stops.has(r.stop_id))throw Error('Unknown stop '+r.stop_id);const trip=tripMap.get(r.trip_id);if(!trip)throw Error('Unknown trip '+r.trip_id);trip.times.push({...r,a:time(r.arrival_time),d:time(r.departure_time)})}
 for(const t of tripMap.values()){t.times.sort((a,b)=>+a.stop_sequence-+b.stop_sequence);for(let i=0;i<t.times.length;i++){const r=t.times[i];if(r.d<r.a||(i&&r.a<t.times[i-1].d))throw Error('Non-monotonic times in trip '+t.trip_id)}}
 const shapes=new Map();for(const s of feed.shapes||[]){if(!shapes.has(s.shape_id))shapes.set(s.shape_id,[]);shapes.get(s.shape_id).push(s)}for(const [id,rows]of shapes){rows.sort((a,b)=>+a.shape_pt_sequence-+b.shape_pt_sequence);shapes.set(id,rows.map(r=>[+r.shape_pt_lon,+r.shape_pt_lat,r.shape_dist_traveled===''?null:+r.shape_dist_traveled]))}
 return {feed,stops,trips:[...tripMap.values()],shapes,shapeCache:new Map()};
}

// Each timed edge is usable only at its fixed departure/arrival pair.
// Static street edges can be traversed at any time at the profile's speed.
export function solveGraph(count,edges,source,sink,start,end,visit=null,maxWalk=Infinity){
 const out=Array.from({length:count},()=>[]),rev=Array.from({length:count},()=>[]);
 edges.forEach((e,i)=>{out[e.u].push(i);rev[e.v].push(i)});
 const visits=Array.isArray(visit)?visit:visit?[visit]:[],phases=visits.length+1,terminal=(phases-1)*count+sink;
 function search(reverse){const d=new Float64Array(count*phases);d.fill(Infinity);const root=reverse?terminal:source;d[root]=reverse?-end:start;const heap=new Heap();heap.push(root,d[root]);const relax=(v,next)=>{if(next<d[v]&&next<=(reverse?-start:end)+1e-7){d[v]=next;heap.push(v,next)}};
 while(heap.length){const [state,score]=heap.pop();if(score!==d[state])continue;const phase=Math.floor(state/count),n=state%count;
 for(const i of (reverse?rev:out)[n]){const e=edges[i],v=phase*count+(reverse?e.u:e.v);let next;if(e.depart!==undefined){if(reverse){if(-score+1e-7<e.arrive)continue;next=-e.depart}else{if(score>e.depart+1e-7)continue;next=e.arrive}}else next=score+e.cost;relax(v,next)}
 const visit=visits[reverse?phase-1:phase];
 if(visit&&n===visit.node){
 const next=visit.start===undefined?score+visit.duration:reverse?(-score+1e-7>=visit.start+visit.duration?-visit.start:Infinity):(score<=visit.start+1e-7?visit.start+visit.duration:Infinity);
 relax((phase+(reverse?-1:1))*count+n,next);
 }
 }return d}
 const earliest=search(false),neg=search(true),latest=Float64Array.from(neg,x=>-x);if(!Number.isFinite(maxWalk))return {earliest,latest,connected:earliest[terminal]<=end};
 // Resource-constrained labels: an earlier arrival can consume more walking,
 // so retaining just one arrival per vertex would incorrectly drop journeys.
 function resourceSearch(reverse){
  const labels=new Array(count*phases),pool=[],heap=new Heap(),limit=reverse?-start:end;
  function add(state,score,walk){
   if(!Number.isFinite(score)||walk>maxWalk+1e-7||score>limit+1e-7)return;
   if(reverse?-score<earliest[state]-1e-7:score>latest[state]+1e-7)return;
   const old=labels[state]||[];
   if(old.some(l=>l.score<=score+1e-7&&l.walk<=walk+1e-7))return;
   const keep=old.filter(l=>{if(score<=l.score+1e-7&&walk<=l.walk+1e-7){l.active=false;return false}return true});
   const label={state,score,walk,active:true};keep.push(label);labels[state]=keep;
   if(pool.length>=2000000)throw Error('Walking constraint exceeds browser label capacity. Reduce the study area or time budget.');
   heap.push(pool.length,score);pool.push(label);
  }
  add(reverse?terminal:source,reverse?-end:start,0);
  while(heap.length){const [id]=heap.pop(),l=pool[id];if(!l.active)continue;const {state,score,walk}=l,phase=Math.floor(state/count),n=state%count;
   for(const i of (reverse?rev:out)[n]){const e=edges[i];let next;
    if(e.depart!==undefined){if(reverse){if(-score+1e-7<e.arrive)continue;next=-e.depart}else{if(score>e.depart+1e-7)continue;next=e.arrive}}else next=score+e.cost;
    add(phase*count+(reverse?e.u:e.v),next,walk+(e.walk||0));
   }
   const visit=visits[reverse?phase-1:phase];
 if(visit&&n===visit.node){
    const next=visit.start===undefined?score+visit.duration:reverse?(-score+1e-7>=visit.start+visit.duration?-visit.start:Infinity):(score<=visit.start+1e-7?visit.start+visit.duration:Infinity);
    add((phase+(reverse?-1:1))*count+n,next,walk);
   }
  }
  return labels;
 }
 const forward=resourceSearch(false),backward=resourceSearch(true);
 return {earliest,latest,forward,backward,maxWalk,connected:!!forward[terminal]?.length};
}
export function tripGeometry(prepared,trip,a,b){
 const key=[trip.shape_id,a.stop_id,b.stop_id,a.shape_dist_traveled,b.shape_dist_traveled].join('|');if(prepared.shapeCache.has(key))return prepared.shapeCache.get(key);
 const sa=prepared.stops.get(a.stop_id),sb=prepared.stops.get(b.stop_id),start=[+sa.stop_lon,+sa.stop_lat],finish=[+sb.stop_lon,+sb.stop_lat],shape=prepared.shapes.get(trip.shape_id);let path=[start,finish];
 if(shape?.length){const da=a.shape_dist_traveled===''?null:+a.shape_dist_traveled,db=b.shape_dist_traveled===''?null:+b.shape_dist_traveled;let inside;
 if(da!==null&&db!==null&&db>=da&&shape.every(p=>p[2]!==null))inside=shape.filter(p=>p[2]>da&&p[2]<db).map(p=>p.slice(0,2));else{let ai=0,bi=0,ad=Infinity,bd=Infinity;for(let i=0;i<shape.length;i++){const d=meters(start,shape[i]);if(d<ad){ad=d;ai=i}}for(let i=ai;i<shape.length;i++){const d=meters(finish,shape[i]);if(d<bd){bd=d;bi=i}}inside=ad<200&&bd<200?shape.slice(ai,bi+1).map(p=>p.slice(0,2)):[]}
 if(inside.length)path=[start,...inside,finish];}
 prepared.shapeCache.set(key,path);return path;
}

export function multimodal(prepared,roads,p,snapCache=new Map()){
 const schedule=Array.isArray(p.anchors)?normalizeAnchors(p.anchors):null;
 if(schedule)p={...p,start:schedule[0].stayStart,end:schedule.at(-1).endTime,anchors:schedule};
 const started=performance.now(),start=time(p.start),end=time(p.end),mode=p.mode||'transit',bit=MODE_BITS[mode],buffer=+p.buffer*60,walk=+p.walkSpeed||4.8,bike=+p.bikeSpeed||16,factor=+p.driveFactor||.65;
 if(!bit)throw Error('Choose a travel profile.');if(end<=start||end-start>10800)throw Error('Use a positive time budget of at most 3 hours.');if(!(buffer>=0&&buffer<=1800))throw Error('Boarding buffer must be 0–30 minutes.');if(walk<1||walk>10||bike<3||bike>45||factor<.1||factor>1)throw Error('Check the travel speeds.');
 const viaEnabled=!schedule&&(p.viaEnabled===true||p.viaEnabled==='true'),stay=viaEnabled?Number(p.stayMinutes)*60:0;
 if(viaEnabled&&(!Number.isFinite(stay)||stay<0||stay>10800))throw Error('Enter a stay duration from 0 to 180 minutes.');
 const fixedStay=viaEnabled&&p.stayStart!==undefined&&p.stayStart!==''?time(p.stayStart):undefined;
 if(fixedStay!==undefined&&(!Number.isFinite(fixedStay)||fixedStay<start||fixedStay+stay>end))throw Error('The entire fixed stay must fit between departure and arrival.');
 const maxWalk=p.maxWalkMinutes===undefined||p.maxWalkMinutes===''?Infinity:Number(p.maxWalkMinutes)*60;
 if(p.maxWalkMinutes!==undefined&&p.maxWalkMinutes!==''&&(!Number.isFinite(maxWalk)||maxWalk<0||maxWalk>10800))throw Error('Maximum walking time must be 0–180 minutes, or blank for no limit.');
 const anchorNames=schedule?schedule.map((a,i)=>'anchor-'+i):viaEnabled?['origin','via','destination']:['origin','destination'];
 if(schedule)for(let i=0;i<schedule.length;i++)p={...p,[anchorNames[i]+'Lon']:schedule[i].lon,[anchorNames[i]+'Lat']:schedule[i].lat};
 const allStops=new Map(prepared.stops);for(const name of anchorNames){if(p[name+'Lon']!==undefined){const lon=Number(p[name+'Lon']),lat=Number(p[name+'Lat']);if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>85)throw Error('Enter valid longitude and latitude for '+name);const id='@anchor:'+name;p={...p,[name]:id};allStops.set(id,{stop_id:id,stop_name:name,stop_lon:lon,stop_lat:lat})}}
 if(schedule)p={...p,origin:p[anchorNames[0]],destination:p[anchorNames.at(-1)]};
 const stopIds=[...allStops.keys()],stopOffset=roads.nodes.length,stopIndex=new Map(stopIds.map((s,i)=>[s,stopOffset+i]));if(!stopIndex.has(p.origin)||!stopIndex.has(p.destination))throw Error('Choose a valid stop ID for both anchors.');
 if(!snapCache.has(bit)){const nearest=makeSpatialIndex(roads,bit),snaps=new Map();for(const s of prepared.stops.values())snaps.set(s.stop_id,nearest([+s.stop_lon,+s.stop_lat]));snapCache.set(bit,{nearest,snaps})}const cached=snapCache.get(bit),snaps=new Map(cached.snaps);for(const name of anchorNames){const s=allStops.get(p[name]);if(!snaps.has(p[name]))snaps.set(p[name],cached.nearest([+s.stop_lon,+s.stop_lat]))}
 if(anchorNames.some(name=>!snaps.get(p[name])))throw Error('An anchor has no usable road node within 150 m for this mode. Choose another stop or load a larger road network.');
 const edges=[];let count=stopOffset+stopIds.length;const staticEdge=(u,v,cost,kind,road=-1)=>edges.push({u,v,cost,kind,road,walk:kind==='connector'||kind==='road'&&(mode==='walk'||mode==='transit')?cost:0});
 roads.edges.forEach((e,i)=>{if(e[3]&bit){const speed=mode==='drive'?e[4]*factor:mode==='bike'?bike:walk;staticEdge(e[0],e[1],e[2]*3.6/speed,'road',i)}});
 let snapped=0;for(const [id,snap]of snaps){if(!snap)continue;if(prepared.stops.has(id))snapped++;const i=stopIndex.get(id),cost=snap.distance*3.6/walk;staticEdge(i,snap.node,cost,'connector');staticEdge(snap.node,i,cost,'connector')}
 for(let i=0;i<anchorNames.length;i++)for(let j=i+1;j<anchorNames.length;j++){const a=allStops.get(p[anchorNames[i]]),b=allStops.get(p[anchorNames[j]]);if(+a.stop_lon===+b.stop_lon&&+a.stop_lat===+b.stop_lat){staticEdge(stopIndex.get(p[anchorNames[i]]),stopIndex.get(p[anchorNames[j]]),0,'same-place');staticEdge(stopIndex.get(p[anchorNames[j]]),stopIndex.get(p[anchorNames[i]]),0,'same-place')}}
 const rideEdges=[];let activeTripCount=0;
 if(mode==='transit'){
 const services=active(prepared.feed,p.date);if(!services.size)throw Error('No transit service on this date. Choose a date within the feed period.');
 const event=(t)=>t>=start&&t<=end?count++:null;
 const timed=(u,v,depart,arrive,kind,extra={})=>{if(u!==null&&v!==null&&depart>=start&&arrive<=end){edges.push({u,v,depart,arrive,kind,...extra});if(kind==='ride')rideEdges.push(edges.length-1)}};
 for(const trip of prepared.trips){if(!services.has(trip.service_id))continue;const rows=trip.times;if(!rows.length||rows.at(-1).a<start||rows[0].d>end)continue;activeTripCount++;let prev;
 for(const r of rows){const a=event(r.a),d=event(r.d),stop=stopIndex.get(r.stop_id);timed(a,d,r.a,r.d,'dwell');if(!r.pickup_type||r.pickup_type==='0')timed(stop,d,r.d-buffer,r.d,'board');if(!r.drop_off_type||r.drop_off_type==='0')timed(a,stop,r.a,r.a,'alight');if(prev)timed(prev.d,d===null&&a===null?null:a,prev.row.d,r.a,'ride',{trip:trip.trip_id,route:trip.route_id,from:prev.row.stop_id,to:r.stop_id,tripObject:trip,rowA:prev.row,rowB:r});prev={d,row:r}}}
 }
 const visits=schedule?schedule.map((a,i)=>({node:stopIndex.get(p[anchorNames[i]]),duration:a.duration,start:a.start})):viaEnabled?[{node:stopIndex.get(p.via),duration:stay,start:fixedStay}]:[],phases=visits.length+1;
 const {earliest,latest,connected,forward,backward}=solveGraph(count,edges,stopIndex.get(p.origin),stopIndex.get(p.destination),start,end,visits,maxWalk);
 // Only join prefixes and suffixes whose combined walking fits the same budget.
 const left=n=>forward?(forward[n]||[]).map(l=>({time:l.score,walk:l.walk})):[{time:earliest[n],walk:0}];
 const right=n=>backward?(backward[n]||[]).map(l=>({time:-l.score,walk:l.walk})):[{time:latest[n],walk:0}];
 function windows(u,v,cost,walking,depart,arrive){
  const bands=[];for(const a of left(u))for(const b of right(v)){
   if(!Number.isFinite(a.time)||!Number.isFinite(b.time)||a.walk+walking+b.walk>maxWalk+1e-7)continue;
   if(depart!==undefined){if(a.time<=depart+1e-7&&b.time+1e-7>=arrive)return [{early:depart,late:arrive}];continue}
   if(a.time+cost<=b.time+1e-7)bands.push({early:a.time,late:b.time});
  }
  bands.sort((a,b)=>a.early-b.early);const merged=[];
  for(const b of bands){const prev=merged.at(-1);if(prev&&b.early<=prev.late-cost+1e-7)prev.late=Math.max(prev.late,b.late);else merged.push({...b})}
  return merged;
 }
 const roadSet=new Set(),roadBands=[],connectors=[],rides=[],rideSet=new Set(),intervals=[];
 for(let phase=0;phase<phases;phase++){const offset=phase*count;
 for(const e of edges){const bands=windows(offset+e.u,offset+e.v,e.cost||0,e.walk||0,e.depart,e.arrive);if(!bands.length)continue;
  if(e.kind==='road'){roadSet.add(e.road);for(const band of bands)roadBands.push({road:e.road,...band,phase})}
  else if(e.kind==='connector'){const point=n=>n<stopOffset?roads.nodes[n]:[+allStops.get(stopIds[n-stopOffset]).stop_lon,+allStops.get(stopIds[n-stopOffset]).stop_lat];for(const band of bands)connectors.push({from:point(e.u),to:point(e.v),cost:e.cost,...band,phase})}
  else if(e.kind==='ride'){const key=JSON.stringify([e.trip,e.from,e.to,e.depart,e.arrive]);if(!rideSet.has(key)){rideSet.add(key);rides.push({trip:e.trip,route:e.route,from:e.from,to:e.to,depart:e.depart,arrive:e.arrive,path:tripGeometry(prepared,e.tripObject,e.rowA,e.rowB)})}}
 }
 for(const id of stopIds){const n=offset+stopIndex.get(id);for(const band of windows(n,n,0,0))intervals.push({id,earliest:band.early,latest:band.late,phase})}
 }
 const roadEdges=[...roadSet],activities=visits.map((visit,i)=>{
 const anchorIndex=schedule?i:1,name=anchorNames[anchorIndex],s=allStops.get(p[name]),bands=windows(i*count+visit.node,(i+1)*count+visit.node,visit.duration,0,visit.start,visit.start===undefined?undefined:visit.start+visit.duration),first=bands.length?Math.min(...bands.map(b=>b.early)):null,last=bands.length?Math.max(...bands.map(b=>b.late)):null;
 return {anchorIndex,name:schedule?.[i].label||'Intermediate anchor',lon:+s.stop_lon,lat:+s.stop_lat,duration:visit.duration,fixed:visit.start!==undefined,feasible:connected,earliestStart:connected?first:null,latestStart:connected?last-visit.duration:null,earliestEnd:connected?first+visit.duration:null,latestEnd:connected?last:null};
 }),activity=schedule?null:activities[0]||null;
 const bounds=roads.meta.bbox;let boundary=false;if(bounds){for(let phase=0;phase<phases&&!boundary;phase++)for(let n=0;n<stopOffset;n++)if(earliest[phase*count+n]<=latest[phase*count+n]&&(!forward||windows(phase*count+n,phase*count+n,0,0).length)){const [x,y]=roads.nodes[n];if(y<bounds[0]+.002||y>bounds[2]-.002||x<bounds[1]+.002||x>bounds[3]-.002){boundary=true;break}}}
 // Count each geometric road segment once even when both directions are feasible.
 const unique=new Map();for(const i of roadEdges){const e=roads.edges[i],key=e[0]<e[1]?e[0]+':'+e[1]:e[1]+':'+e[0];unique.set(key,e[2])}
 return {mode,start,end,params:p,anchors:anchorNames.map(name=>{const s=allStops.get(p[name]);const i=anchorNames.indexOf(name);return {name,label:schedule?.[i].label||name,index:i,start:schedule?.[i].start,duration:schedule?.[i].duration||0,lon:+s.stop_lon,lat:+s.stop_lat,snap:snaps.get(p[name])}}),connected,activity,activities,roadBands,earliest:earliest.slice(0,stopOffset),latest:latest.slice(0,stopOffset),roadEdges,connectors,rides,intervals,stopIds:[...new Set(intervals.filter(s=>!s.id.startsWith('@anchor:')).map(s=>s.id))],roadKm:[...unique.values()].reduce((a,b)=>a+b,0)/1000,stats:{nodes:count*phases,edges:edges.length*phases+visits.length,activeTrips:activeTripCount,snappedStops:snapped,totalStops:prepared.stops.size,seconds:(performance.now()-started)/1000,boundary,originSnapMeters:snaps.get(p.origin).distance,destinationSnapMeters:snaps.get(p.destination).distance}};
}
