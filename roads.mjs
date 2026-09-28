// Directed OSM network. Mask bits: walking=1, cycling=2, driving=4.
export const MODE_BITS={walk:1,transit:1,bike:2,drive:4};
export function meters(a,b){const r=Math.PI/180,dy=(b[1]-a[1])*r,dx=(b[0]-a[0])*r;const q=Math.sin(dy/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dx/2)**2;return 12742000*Math.asin(Math.min(1,Math.sqrt(q)))}
const denied=new Set(['no','private','agricultural','forestry','customers','delivery','destination']);
const allowed=new Set(['yes','designated','permissive','official']);
export function permissions(t){
 const h=t.highway;if(!h||['construction','proposed','raceway','corridor','platform','elevator','bus_guideway'].includes(h))return [0,0,0];
 const road=/^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|road)(_link)?$/.test(h);
 const access=(keys,base)=>{for(const k of keys){if(denied.has(t[k]))return false;if(allowed.has(t[k]))return true;if(t[k]==='dismount')return false}return base};
 let walk=access(['foot','access'],!/^motorway|^trunk/.test(h));
 let bike=access(['bicycle','vehicle','access'],!/^motorway|^trunk/.test(h)&&!['steps','footway','pedestrian'].includes(h));
 let car=access(['motorcar','motor_vehicle','vehicle','access'],road);
 if(t.motorroad==='yes'){if(!allowed.has(t.foot))walk=false;if(!allowed.has(t.bicycle))bike=false}
 let forward=(walk?1:0)|(bike?2:0)|(car?4:0),back=forward;
 const one=t.oneway??(t.junction==='roundabout'||h==='motorway'?'yes':'no');
 if(['yes','1','true'].includes(one))back&=1;else if(one==='-1')forward&=1;
 if(bike&&t['oneway:bicycle']==='no'){forward|=2;back|=2}
 if(walk&&t['oneway:foot']==='yes')back&=~1;
 for(const [bit,keys] of [[1,['foot']],[2,['bicycle','vehicle']],[4,['motorcar','motor_vehicle','vehicle']]])for(const [dir,name]of [['forward','forward'],['backward','back']]){for(const k of keys){const v=t[`${k}:${dir}`];if(v!==undefined){if(denied.has(v)){if(name==='forward')forward&=~bit;else back&=~bit}break}}}
 let speed=Number.parseFloat(t.maxspeed);if(Number.isFinite(speed)&&/mph/i.test(t.maxspeed))speed*=1.609344;if(!(speed>0&&speed<=160))speed=({motorway:105,motorway_link:50,trunk:80,trunk_link:45,primary:55,secondary:50,tertiary:40,residential:40,unclassified:40,service:20,living_street:15})[h]||35;
 return [forward,back,speed];
}
export function compileOSM(osm,bbox){
 if(osm.remark)throw Error('Overpass returned incomplete data: '+osm.remark);
 const raw=new Map(osm.elements.filter(n=>n.type==='node').map(n=>[n.id,[n.lon,n.lat]]));const nodes=[],index=new Map(),edges=[],usage=new Map();for(const w of osm.elements)if(w.type==='way'&&w.tags?.highway)for(const n of w.nodes)usage.set(n,(usage.get(n)||0)+1);
 const idx=id=>{if(!index.has(id)){index.set(id,nodes.length);nodes.push(raw.get(id))}return index.get(id)};
 for(const way of osm.elements){if(way.type!=='way')continue;const [f,b,speed]=permissions(way.tags||{});if(!f&&!b)continue;let anchor=way.nodes[0],length=0;for(let i=1;i<way.nodes.length;i++){const a=way.nodes[i-1],z=way.nodes[i];if(!raw.has(a)||!raw.has(z)||!raw.has(anchor)){anchor=z;length=0;continue}length+=meters(raw.get(a),raw.get(z));if(usage.get(z)>1||length>=60||i===way.nodes.length-1){if(length>=.05){const u=idx(anchor),v=idx(z);if(f)edges.push([u,v,+length.toFixed(2),f,+speed.toFixed(1)]);if(b)edges.push([v,u,+length.toFixed(2),b,+speed.toFixed(1)])}anchor=z;length=0}}}
 return {nodes,edges,meta:{source:'OpenStreetMap contributors',license:'ODbL 1.0',sourceURL:'https://www.openstreetmap.org/copyright',timestamp:osm.osm3s?.timestamp_osm_base,bbox,description:'OpenStreetMap street and path network. Geometry simplified between shared junctions and approximately 60 m vertices; accumulated source length retained.',schema:'[from,to,meters,modeMask,driveKmh]'}};
}
export class Heap{constructor(){this.a=[]}push(n,d){const a=this.a;let i=a.length;a.push([n,d]);while(i){const p=(i-1)>>1;if(a[p][1]<=d)break;a[i]=a[p];i=p}a[i]=[n,d]}pop(){const a=this.a,res=a[0],last=a.pop();if(a.length){let i=0;while(true){let k=2*i+1;if(k>=a.length)break;if(k+1<a.length&&a[k+1][1]<a[k][1])k++;if(a[k][1]>=last[1])break;a[i]=a[k];i=k}a[i]=last}return res}get length(){return this.a.length}}
export function makeSpatialIndex(roads,bit){const cells=new Map(),used=new Uint8Array(roads.nodes.length);for(const e of roads.edges)if(e[3]&bit){used[e[0]]=used[e[1]]=1}const key=(x,y)=>`${x},${y}`;roads.nodes.forEach((p,i)=>{if(!used[i])return;const k=key(Math.floor(p[0]*1000),Math.floor(p[1]*1000));if(!cells.has(k))cells.set(k,[]);cells.get(k).push(i)});return p=>{let best=-1,dist=150;const x=Math.floor(p[0]*1000),y=Math.floor(p[1]*1000);for(let dx=-3;dx<=3;dx++)for(let dy=-2;dy<=2;dy++)for(const i of cells.get(key(x+dx,y+dy))||[]){const d=meters(p,roads.nodes[i]);if(d<dist){best=i;dist=d}}return best<0?null:{node:best,distance:dist}}}
