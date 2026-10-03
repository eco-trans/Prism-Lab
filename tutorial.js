let activeTour=null;
export function startTutorial(){
 if(activeTour)return;
 const sidebar=document.querySelector('.sidebar-scroll'),scroll=sidebar.scrollTop;
 const details=[...document.querySelectorAll('aside details')],open=details.map(d=>d.open);
 const data=document.querySelector('#viewUpload').closest('details'),exports=document.querySelector('#photo').closest('details');
 const steps=[
 {title:'Welcome to Prism Lab',intro:'Explore where you can travel between required places and times. This guide highlights the main controls.'},
 {element:data.querySelector('summary'),title:'Data',intro:'COTA loads automatically after the quick preview. Open Data to import your own GTFS ZIP and matching OSM PBF, or a saved View JSON.'},
 {element:'#mode',title:'Travel mode',intro:'Choose transit with walking, walking, biking or driving.'},
 {element:'#date',title:'Service date',intro:'Choose the day whose GTFS schedule should be used.'},
 {element:'#maxWalkMinutes',title:'Walking budget',intro:'Limit total walking across the journey, including access, transfers and egress. Leave blank for unlimited walking.'},
 {element:'.anchors-group h2',title:'Required anchors',intro:'Set coordinates or use Place on map. Each anchor has an exact stay start and duration. Add more anchors for required visits; zero minutes means an exact-time visit.'},
 {element:'#calculate',title:'Calculate',intro:'Apply your settings here. If COTA is still loading, your calculation is queued automatically.'},
 {element:'#calculationProgress',title:'Progress',intro:'Loading, calculation and completion messages stay here.'},
 {element:'.slice',title:'Time and animation',intro:'Drag to preview the time plane; release to update reachability. Choose an increment (default 1 minute) and press Animate. Pause or move the slider to stop.'},
 {element:'#map2d',title:'2D Time Slice',intro:'Shows reachable network locations at the selected time. You can also place anchors on this map.'},
 {element:'.plot-wrap',title:'3D prism',intro:'Drag to rotate; click a prism feature to select its time. View: Network / Smooth switches between exact links and an approximate envelope. Layers controls visibility.'},
 {element:exports.querySelector('summary'),title:'Export and reopen',intro:'Open Export to save a PNG, View JSON for reopening, or model data. Reopen a View JSON from Data. You can restart this guide anytime with Tutorial.'}
 ];
 let refreshFrame=null;
 const refresh=()=>{if(refreshFrame!==null)cancelAnimationFrame(refreshFrame);refreshFrame=requestAnimationFrame(()=>{refreshFrame=null;activeTour?.refresh()})};
 sidebar.addEventListener('scroll',refresh,{passive:true});window.addEventListener('resize',refresh);
 const restore=()=>{sidebar.removeEventListener('scroll',refresh);window.removeEventListener('resize',refresh);if(refreshFrame!==null)cancelAnimationFrame(refreshFrame);details.forEach((d,i)=>d.open=open[i]);sidebar.scrollTop=scroll;activeTour=null;document.querySelector('#tutorial').focus()};
 activeTour=introJs.tour().setOptions({steps,showProgress:true,showBullets:false,exitOnOverlayClick:false,nextLabel:'Next →',prevLabel:'← Back',doneLabel:'Done',tooltipClass:'prism-tour',scrollToElement:false,disableInteraction:true});
 activeTour.onbeforechange(async el=>{
  if(!el)return;
  let p=el.parentElement;while(p){if(p.tagName==='DETAILS'&&el!==p.querySelector('summary'))p.open=true;p=p.parentElement}
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(sidebar.contains(el)){
   const target=el.getBoundingClientRect(),container=sidebar.getBoundingClientRect();
   sidebar.scrollTo({top:sidebar.scrollTop+target.top-container.top-(container.height-target.height)/2,behavior:'instant'});
  }
  // Intro.js must measure after nested scrolling and disclosure layout settle.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 });
 activeTour.onafterchange(refresh);
 activeTour.onexit(restore);activeTour.oncomplete(restore);activeTour.start();
}
