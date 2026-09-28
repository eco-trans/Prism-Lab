// Plotly's z coordinate is elapsed minutes, while the linked slider uses percent.
export function slicePercent(z,duration){
 if(typeof z!=='number'||!Number.isFinite(z)||!Number.isFinite(duration)||duration<=0)return null;
 return Math.max(0,Math.min(100,z/duration*100));
}

// Track the whole gesture: returning to the starting position is still a drag.
export function clickGesture(threshold=4){
 let start=null,moved=false;
 const cancel=()=>{start=null;moved=false};
 function move(e){if(start&&e.pointerId===start.id&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>=threshold)moved=true}
 return {cancel,move,down(e){if(start||e.button!==0||e.isPrimary===false){cancel();return}start={id:e.pointerId,x:e.clientX,y:e.clientY};moved=false},up(e){if(!start||e.pointerId!==start.id)return false;move(e);const click=!moved;cancel();return click}};
}

export function bindTimePicking(graph,pick){
 const gesture=clickGesture();let hoveredZ=null,frame=null;
 const hover=e=>{hoveredZ=e.points?.[0]?.z},unhover=()=>{hoveredZ=null};
 const cancel=()=>{gesture.cancel();if(frame!==null)cancelAnimationFrame(frame);frame=null};
 const down=e=>{if(frame!==null)cancelAnimationFrame(frame);frame=null;gesture.down(e)};
 const up=e=>{if(gesture.up(e))frame=requestAnimationFrame(()=>{frame=null;pick(hoveredZ)})};
 const leave=()=>{cancel();hoveredZ=null};
 // Plotly can emit plotly_click after camera drags. Only our pointer gesture
 // may commit a time; Plotly hover supplies the picked 3D coordinate.
 graph.on('plotly_hover',hover);graph.on('plotly_unhover',unhover);
 const handlers={pointerdown:down,pointermove:gesture.move,pointerup:up,pointercancel:cancel,pointerleave:leave};
 for(const [name,handler]of Object.entries(handlers))graph.addEventListener(name,handler,true);
 return ()=>{cancel();for(const [name,handler]of Object.entries(handlers))graph.removeEventListener(name,handler,true);graph.removeListener('plotly_hover',hover);graph.removeListener('plotly_unhover',unhover)};
}
