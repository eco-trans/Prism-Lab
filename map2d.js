export function createMap(onChange,onSelection=()=>{}){
 const map=L.map('map2d',{preferCanvas:true,zoomControl:true}).setView([39.96278,-83.00090],14),renderer=L.canvas({padding:.3});
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).addTo(map);
 const roads=L.polyline([],{renderer,color:'#c67a0a',weight:2,opacity:.8,interactive:false}).addTo(map),buses=L.layerGroup().addTo(map),activities=L.layerGroup().addTo(map),markers=new Map(),busMarkers=[];let selection=null;
 function select(id){selection=id;onSelection(id);document.getElementById('mapHint').textContent=id?'Click the 2D map to place the selected anchor.':'Place anchors on the map or enter coordinates.';map.getContainer().style.cursor=id?'crosshair':''}
 map.on('click',e=>{if(selection){onChange(selection,e.latlng.lng,e.latlng.lat);select(null)}});
 new ResizeObserver(()=>map.invalidateSize()).observe(map.getContainer());
 return {map,select,finishPlacement(){select(null)},setAnchors(p){
  const anchors=p.anchors||[],ids=new Set(anchors.map(a=>a.id));for(const [id,marker]of markers)if(!ids.has(id)){map.removeLayer(marker);markers.delete(id)}
  anchors.forEach((a,i)=>{if(!Number.isFinite(+a.lon)||!Number.isFinite(+a.lat)||a.lon===''||a.lat==='')return;
   const color=i===0?'#ffad70':i===anchors.length-1?'#ff9466':'#ffc044',icon=L.divIcon({className:'anchor-pin',html:`<span style="background:${color}">${i+1}</span>`,iconSize:[28,34],iconAnchor:[14,34]});
   let marker=markers.get(a.id);if(!marker){marker=L.marker([+a.lat,+a.lon],{draggable:true,title:`Anchor ${i+1}`,icon}).addTo(map);marker.on('dragend',()=>{const point=marker.getLatLng();onChange(a.id,point.lng,point.lat)});markers.set(a.id,marker)}else marker.setLatLng([+a.lat,+a.lon]).setIcon(icon);
   marker.getElement()?.setAttribute('title',`${i+1} · ${a.label}`);
  });if(selection&&!ids.has(selection))select(null);
 },fit(b){map.fitBounds([[b[1],b[0]],[b[3],b[2]]],{padding:[25,25],maxZoom:16})},show(g){
  activities.clearLayers();for(const p of g.activities||[])L.circleMarker([p[1],p[0]],{renderer,radius:10,color:'#a45b00',fillColor:'#ffc044',fillOpacity:.65,weight:2,interactive:false}).addTo(activities);
  roads.setLatLngs(g.segments.map(s=>s.map(p=>[p[1],p[0]])));
  for(let i=0;i<g.vehicles.length;i++){const p=g.vehicles[i];if(!busMarkers[i])busMarkers[i]=L.circleMarker([p[1],p[0]],{renderer,radius:4,color:'#723800',fillColor:'#ffad70',fillOpacity:1,weight:1,interactive:false});busMarkers[i].setLatLng([p[1],p[0]]);if(!buses.hasLayer(busMarkers[i]))buses.addLayer(busMarkers[i])}
  for(let i=g.vehicles.length;i<busMarkers.length;i++)buses.removeLayer(busMarkers[i]);
 },clear(){activities.clearLayers();roads.setLatLngs([]);buses.clearLayers()}};
}
