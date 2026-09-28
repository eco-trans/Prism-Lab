import './vendor/osm-pbf-schema.js';
import {compileOSM} from './roads.mjs';
const schema=globalThis.OsmPbfSchema,decode=new TextDecoder(),MAX_BLOCK=32*1024*1024;

async function inflate(bytes,expected){
 if(!Number.isInteger(expected)||expected<1||expected>MAX_BLOCK)throw Error('Invalid PBF uncompressed block size.');
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader(),parts=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>expected)throw Error('PBF block exceeds its declared size.');parts.push(value)}}catch(e){await reader.cancel().catch(()=>{});throw e}
 if(total!==expected)throw Error('Truncated PBF compressed block.');const out=new Uint8Array(total);let at=0;for(const part of parts){out.set(part,at);at+=part.length}return out;
}

// Blob/File slices avoid reading an entire state extract into one ArrayBuffer.
async function scan(file,visit,onProgress){
 let offset=0,header=null;
 while(offset<file.size){
  if(file.size-offset<4)throw Error('Truncated PBF block header.');
  const size=new DataView(await file.slice(offset,offset+4).arrayBuffer()).getUint32(0);offset+=4;
  if(size<1||size>65536||offset+size>file.size)throw Error('Not a valid OSM PBF file (invalid header length).');
  const h=schema.header(new Uint8Array(await file.slice(offset,offset+size).arrayBuffer()));offset+=size;
  if(!Number.isInteger(h.datasize)||h.datasize<1||h.datasize>MAX_BLOCK||offset+h.datasize>file.size)throw Error('Invalid or truncated PBF data block.');
  const blob=schema.blob(new Uint8Array(await file.slice(offset,offset+h.datasize).arrayBuffer()));offset+=h.datasize;
  let raw;if(blob.raw?.length)raw=blob.raw;else if(blob.zlib_data?.length)raw=await inflate(blob.zlib_data,blob.raw_size);else throw Error('This PBF compression is unsupported. Use a standard raw/zlib OSM extract.');
  if(raw.length>MAX_BLOCK)throw Error('Oversized PBF block.');
  if(h.type==='OSMHeader'){
   if(header)throw Error('Multiple PBF headers are unsupported.');header=schema.metadata(raw);
   for(const f of header.required_features||[])if(!['OsmSchema-V0.6','DenseNodes'].includes(f))throw Error('Unsupported PBF feature: '+f+'. Use a current snapshot, not a history file.');
  }else if(h.type==='OSMData'){if(!header)throw Error('PBF header is missing.');visit(schema.data(raw));}
  onProgress(offset/file.size);
 }
 if(!header)throw Error('OSM PBF header is missing.');return header;
}

export async function roadsFromPbf(file,bbox,onProgress=()=>{}){
 if(!file?.size)throw Error('The PBF file is empty.');

 if(!Array.isArray(bbox)||bbox.length!==4||!bbox.every(Number.isFinite)||bbox[0]>=bbox[2]||bbox[1]>=bbox[3]||bbox[0]<-85||bbox[2]>85||bbox[1]<-180||bbox[3]>180)throw Error('Select a valid study area on the 2D map.');
 const points=new Map(),ways=[];let last=-1;
 const progress=(pass,f)=>{const percent=Math.floor(f*100);if(percent!==last){last=percent;onProgress({pass,percent})}};
 const save=(id,lat,lon)=>{if(!Number.isSafeInteger(id)||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Invalid PBF node.');if(lat>=bbox[0]&&lat<=bbox[2]&&lon>=bbox[1]&&lon<=bbox[3]){points.set(id,{type:'node',id,lat,lon});if(points.size>2000000)throw Error('Study area contains too many nodes. Zoom in and re-import the PBF.')}};
 const header=await scan(file,block=>{
  const scale=(block.granularity??100)*1e-9,latOffset=(block.lat_offset||0)*1e-9,lonOffset=(block.lon_offset||0)*1e-9;
  for(const g of block.primitivegroup){
   for(const n of g.nodes||[])save(n.id,latOffset+scale*n.lat,lonOffset+scale*n.lon);
   if(g.dense){let id=0,lat=0,lon=0;const d=g.dense;if(d.id.length!==d.lat.length||d.id.length!==d.lon.length)throw Error('Invalid dense PBF coordinates.');for(let i=0;i<d.id.length;i++){id+=d.id[i];lat+=d.lat[i];lon+=d.lon[i];save(id,latOffset+scale*lat,lonOffset+scale*lon)}}
  }
 },f=>progress(1,f));
 if(!points.size)throw Error('No PBF nodes in the selected map area. Move the map to the extract region and retry.');
 last=-1;
 await scan(file,block=>{
  const strings=block.stringtable.s.map(s=>decode.decode(s));
  for(const g of block.primitivegroup)for(const w of g.ways||[]){
   const tags=Object.create(null);for(let i=0;i<w.keys.length;i++)tags[strings[w.keys[i]]]=strings[w.vals[i]];
   if(!tags.highway||tags.area==='yes')continue;
   let id=0;const nodes=w.refs.map(delta=>{id+=delta;if(!Number.isSafeInteger(id))throw Error('Invalid PBF way node reference.');return id});if(!nodes.some(n=>points.has(n)))continue;
   ways.push({type:'way',id:w.id,nodes,tags});if(ways.length>500000)throw Error('Too many roads in this area. Zoom in and re-import.');
  }
 },f=>progress(2,f));
 onProgress({pass:3,percent:0});
 const used=new Set();for(const w of ways)for(const id of w.nodes)if(points.has(id))used.add(id);
 const elements=Array.from(used,id=>points.get(id));for(const w of ways)elements.push(w);
 const timestamp=header.osmosis_replication_timestamp?new Date(header.osmosis_replication_timestamp*1000).toISOString():undefined;
 const roads=compileOSM({elements,osm3s:{timestamp_osm_base:timestamp}},bbox);
 if(!roads.edges.length)throw Error('No usable highway segments in the selected PBF area.');
 if(roads.nodes.length>1000000||roads.edges.length>2500000)throw Error('Road graph is too large. Zoom in and re-import.');
 roads.meta.format='OSM PBF';roads.meta.file=file.name||'OSM extract';roads.meta.description='Roads decoded directly from OSM PBF; clipped to nodes within the selected study area. Routes beyond that area are not included.';
 return roads;
}
