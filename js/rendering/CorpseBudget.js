export function disposeCorpse(corpse,scene){
  scene.remove(corpse.mesh);
  corpse.mesh.traverse(child=>{
    child.geometry?.dispose();
    if(Array.isArray(child.material))for(const material of child.material)material.dispose();
    else child.material?.dispose();
  });
}

// Retain nearby wreck detail; a mass casualty burst must not retain unlimited models.
export function trimCorpses(corpses,scene,camera,quality='high'){
  const limit=({low:4,medium:8,high:12,ultra:24})[quality]??12;
  while(corpses.length>limit){
    let index=0,distance=-1;
    for(let i=0;i<corpses.length;i++){
      const d=corpses[i].mesh.position.distanceToSquared(camera.position);
      if(d>distance){index=i;distance=d;}
    }
    disposeCorpse(corpses.splice(index,1)[0],scene);
  }
}
