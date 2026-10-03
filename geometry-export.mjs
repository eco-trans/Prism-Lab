export function timeSliceGeoJSON(g,result,at,meta){
 const common={mode:result.mode,service_date:result.params.date,time_seconds:at,timezone:meta.timezone};
 const feature=(type,coordinates,kind)=>({type:'Feature',properties:{...common,kind},geometry:{type,coordinates}});
 return {type:'FeatureCollection',features:[...g.segments.map(s=>feature('LineString',s,'reachable_network')),...g.vehicles.map(p=>feature('Point',p,'transit_position')),...(g.activities||[]).map(p=>feature('Point',p,'required_stay'))]};
}
export function shapeOBJ(traces,result){
 const lon=result.anchors[0].lon,lat=result.anchors[0].lat,scale=6371000*Math.PI/180;
 const out=['# Prism Lab - Luyu Liu / EcoTrans Lab','# OSM contributors; GTFS schedule geometry',`# Origin longitude ${lon}; latitude ${lat}`,`# x=east meters; y=north meters; z=100 meters per elapsed minute from ${result.start} service-day seconds`,`# Date ${result.params.date}; mode ${result.mode}`];let count=0;
 const names=new Set(['Feasible street travel-time bands','Time-sliced envelope','Earliest feasible road passage','Transit','Required stay']);
 for(const t of traces){if(!names.has(t.name))continue;out.push('o '+t.name.replaceAll(' ','_'));const indices=[];
 for(let i=0;i<t.x.length;i++){if(!Number.isFinite(t.x[i])||!Number.isFinite(t.y[i])||!Number.isFinite(t.z[i])){indices.push(null);continue}out.push(`v ${((t.x[i]-lon)*scale*Math.cos(lat*Math.PI/180)).toFixed(6)} ${((t.y[i]-lat)*scale).toFixed(6)} ${(t.z[i]*100).toFixed(6)}`);indices.push(++count)}
 if(t.type==='mesh3d'){for(let f=0;f<t.i.length;f++){const a=indices[t.i[f]],b=indices[t.j[f]],c=indices[t.k[f]];if(a&&b&&c)out.push(`f ${a} ${b} ${c}`)}}else{let line=[];const flush=()=>{if(line.length>1)out.push('l '+line.join(' '));line=[]};for(const n of indices){if(n===null)flush();else line.push(n)}flush()}
 }
 if(!count)throw Error('Enable prism bands or transit paths before exporting the 3D shape.');return out.join('\n')+'\n';
}
