const tileX=(lon,z)=>(lon+180)/360*2**z;
const tileY=(lat,z)=>(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*2**z;
const lonAt=(x,z)=>x/2**z*360-180;
const latAt=(y,z)=>Math.atan(Math.sinh(Math.PI*(1-2*y/2**z)))*180/Math.PI;
const memory=new Map();
// Request only the tiles in the current 3D map extent. Browser HTTP caching applies.
export async function mapSurface(bounds){
 let z=14,x0,x1,y0,y1;for(;z>=3;z--){x0=Math.floor(tileX(bounds[0],z));x1=Math.floor(tileX(bounds[2],z));y0=Math.floor(tileY(bounds[3],z));y1=Math.floor(tileY(bounds[1],z));if((x1-x0+1)*(y1-y0+1)<=12)break}
 const canvas=document.createElement('canvas');canvas.width=(x1-x0+1)*256;canvas.height=(y1-y0+1)*256;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const url=`https://tile.openstreetmap.org/${z}/${x}/${y}.png`;if(!memory.has(url))memory.set(url,new Promise((resolve,reject)=>{const img=new Image();const timer=setTimeout(()=>reject(Error('Basemap tiles timed out')),12000);img.crossOrigin='anonymous';img.onload=()=>{clearTimeout(timer);resolve(img)};img.onerror=()=>{clearTimeout(timer);reject(Error('Basemap tiles unavailable'))};img.src=url}));ctx.drawImage(await memory.get(url),(x-x0)*256,(y-y0)*256)}
 const size=192,small=document.createElement('canvas');small.width=small.height=size;const sc=small.getContext('2d',{willReadFrequently:true});sc.drawImage(canvas,0,0,size,size);const pixels=sc.getImageData(0,0,size,size).data;
 const x=Array.from({length:size},(_,i)=>lonAt(x0+(x1-x0+1)*i/(size-1),z)),y=Array.from({length:size},(_,j)=>latAt(y0+(y1-y0+1)*j/(size-1),z));
 // Actual RGB vertex colors avoid interpolating arbitrary palette indices.
 const mesh={type:'mesh3d',x:[],y:[],z:[],i:[],j:[],k:[],vertexcolor:[],hoverinfo:'skip',opacity:1,lighting:{ambient:1,diffuse:0,specular:0},name:'OpenStreetMap basemap',showlegend:false};
 for(let row=0;row<size;row++)for(let col=0;col<size;col++){const n=row*size+col,k=4*n;mesh.x.push(x[col]);mesh.y.push(y[row]);mesh.z.push(-.45);const gray=Math.round(.2126*pixels[k]+.7152*pixels[k+1]+.0722*pixels[k+2]);mesh.vertexcolor.push(`rgb(${gray},${gray},${gray})`);if(row<size-1&&col<size-1){mesh.i.push(n,n);mesh.j.push(n+1,n+size+1);mesh.k.push(n+size+1,n+size)}}
 return mesh;
}
