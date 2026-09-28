export function currentCamera(graph){
 const live=graph._fullLayout?.scene?._scene?.getCamera?.();
 const camera=live||graph.layout?.scene?.camera;
 return camera?structuredClone(camera):null;
}

export function updateSlicePreservingCamera(plotly,graph,data,indices){
 const camera=currentCamera(graph);
 // Supply the live camera in the same update as the slice. A data-only update
 // can otherwise restore the older camera still stored in the input layout.
 return plotly.update(graph,data,camera?{'scene.camera':camera}:{},indices);
}
