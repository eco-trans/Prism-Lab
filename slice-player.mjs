// One asynchronous render at a time; intermediate inputs never form a backlog.
export function latestRenderer(render,onError=()=>{}){
 let pending=null,running=false,version=0;const waiters=[];
 async function drain(){if(running)return;running=true;try{while(pending){const job=pending;pending=null;try{await render(job.value,job.version)}catch(e){if(job.version===version)onError(e)}}}finally{running=false;for(const resolve of waiters.splice(0))resolve()}}
 return {push(value){pending={value,version};void drain()},cancel(){version++;pending=null},isCurrent(v){return v===version},whenIdle(){return running?new Promise(resolve=>waiters.push(resolve)):Promise.resolve()},get active(){return running||pending!==null}};
}

// Preview has its own lightweight renderer. Only release reaches the network queue.
export function sliceSelection(showPreview,commit){
 return {input(value){showPreview(value)},
 change(value){showPreview(value);commit(value)}};
}
