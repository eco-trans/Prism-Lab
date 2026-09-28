// Plotly 2.35.2 adapter: read the same matrices/data scaling used by its 3D
// annotations. Never write to the scene or request a Plotly/WebGL redraw.
function multiply(matrix, point) {
 const out=[0,0,0,0];
 for(let col=0;col<4;col++)for(let row=0;row<4;row++)out[row]+=matrix[col*4+row]*point[col];
 return out;
}

// Clip in homogeneous coordinates before dividing by w (including near plane).
export function projectPlane(bounds,z,scale,matrices,viewport){
 let points=[[bounds[0],bounds[1],z],[bounds[2],bounds[1],z],[bounds[2],bounds[3],z],[bounds[0],bounds[3],z]]
  .map(p=>multiply(matrices.projection,multiply(matrices.view,multiply(matrices.model,[p[0]*scale[0],p[1]*scale[1],p[2]*scale[2],1]))));
 for(const axis of [0,1,2])for(const sign of [-1,1]){
  const clipped=[];
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length],da=a[3]+sign*a[axis],db=b[3]+sign*b[axis];
   if(da>=0)clipped.push(a);
   if((da>=0)!==(db>=0)){const t=da/(da-db);clipped.push(a.map((v,j)=>v+t*(b[j]-v)))}
  }
  points=clipped;
 }
 return points.filter(p=>p[3]>1e-12).map(p=>[viewport.x+(1+p[0]/p[3])*viewport.width/2,viewport.y+(1-p[1]/p[3])*viewport.height/2]);
}

export function createPlaneOverlay(plot){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),polygon=document.createElementNS(ns,'polygon');
 svg.classList.add('slice-plane-overlay');svg.setAttribute('aria-hidden','true');
 polygon.setAttribute('fill','#92a6c9');polygon.setAttribute('fill-opacity','.10');
 polygon.setAttribute('stroke','#a9bddb');polygon.setAttribute('stroke-opacity','.40');polygon.setAttribute('stroke-width','1');
 svg.appendChild(polygon);plot.parentElement.appendChild(svg);
 let bounds=null,duration=0,value=50,frame=0,glplot=null,originalRender=null,wrappedRender=null;
 function paint(){
  frame=0;const started=performance.now(),layout=plot._fullLayout,scene=layout?.scene?._scene,matrices=scene?.glplot?.cameraParams;
  if(!bounds||!matrices){polygon.setAttribute('points','');return}
  const size=layout._size,domain=layout.scene.domain;
  const viewport={x:size.l+domain.x[0]*size.w,y:size.t+(1-domain.y[1])*size.h,width:(domain.x[1]-domain.x[0])*size.w,height:(domain.y[1]-domain.y[0])*size.h};
  svg.setAttribute('viewBox',`0 0 ${layout.width} ${layout.height}`);
  const points=projectPlane(bounds,duration*value/100,scene.dataScale,matrices,viewport);
  polygon.setAttribute('points',points.map(p=>p.join(',')).join(' '));
  svg.dataset.value=String(value);svg.dataset.paintMs=(performance.now()-started).toFixed(3);
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(paint)}
 function detach(){if(glplot?.onrender===wrappedRender)glplot.onrender=originalRender;glplot=originalRender=wrappedRender=null}
 function attach(){
  const next=plot._fullLayout?.scene?._scene?.glplot;
  if(next!==glplot){detach();if(next){glplot=next;originalRender=next.onrender;const previous=originalRender;wrappedRender=function(...args){previous?.apply(this,args);schedule()};next.onrender=wrappedRender}}
  schedule();
 }
 const resize=new ResizeObserver(schedule);resize.observe(plot);
 return {
  configure(b,minutes,selected){bounds=b;duration=minutes;value=selected;attach()},
  move(selected){value=selected;schedule()},
  clear(){bounds=null;detach();if(frame)cancelAnimationFrame(frame);frame=0;polygon.setAttribute('points','')},
  destroy(){this.clear();resize.disconnect();svg.remove()}
 };
}
