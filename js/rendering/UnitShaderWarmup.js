import * as THREE from 'three';

// Compile common unit/corpse/overlay programs before the first simulation tick.
// Keep the warmup materials alive so Three.js does not release their programs
// between a unit's removal and the next production of that unit type.
export async function warmupUnitShaders(renderer,camera,scene,assets,effects,colorTarget=null) {
  const staging=new THREE.Scene(),materials=new Set(),instances=[];
  const add=(geometry,material,instanced)=>{
    materials.add(material);
    const object=instanced?new THREE.InstancedMesh(geometry,material,1):new THREE.Mesh(geometry,material);
    if(instanced)instances.push(object);
    staging.add(object);
  };
  let disposed=false,plane;
  const cleanup=()=>{if(disposed)return;disposed=true;for(const object of instances)object.dispose();for(const material of materials)material.dispose();plane?.dispose();staging.clear();};
  const compile=async source=>{
    const previous=renderer.getRenderTarget();let pending;
    try{renderer.setRenderTarget(colorTarget);pending=renderer.compileAsync(source,camera,scene);}
    finally{renderer.setRenderTarget(previous);}
    await pending;
  };
  try {
    for(const key of assets.cache.keys()){
      if(!key.startsWith('unit_'))continue;
      const model=assets.getTeamTintedModel(key,'player');if(!model)continue;
      model.traverse(part=>{
        if(!part.isMesh||!part.material?.isMeshStandardMaterial)return;
        for(const transparent of [false,true])for(const instanced of [false,true]){
          const material=part.material.clone();material.transparent=transparent;
          material.opacity=transparent?.3:1;add(part.geometry,material,instanced);
        }
        part.material.dispose();
      });
    }
    // Tactical primitives are converted to toon materials by Game.addEntity().
    plane=new THREE.PlaneGeometry(1,1);
    for(const transparent of [false,true]){
      add(plane,new THREE.MeshToonMaterial({gradientMap:assets.toonGradientMap,side:THREE.DoubleSide,transparent}),true);
    }
    effects._shadowTexture??=effects._createShadowTexture();
    add(plane,new THREE.MeshBasicMaterial({map:effects._shadowTexture,transparent:true,side:THREE.DoubleSide,depthWrite:false}),true);
    for(const map of [effects._fireTexture,effects._smokeTexture,effects._sparkTexture]){
      const material=new THREE.SpriteMaterial({map,transparent:true,depthWrite:false,toneMapped:false});
      materials.add(material);staging.add(new THREE.Sprite(material));
    }
    await compile(staging);
    await compile(scene);
    // This geometry belongs only to the warmup; retained objects are never drawn.
    return {dispose:cleanup};
  }catch(error){cleanup();throw error;}
}
