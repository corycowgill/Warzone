import * as THREE from 'three';

// Original meshes remain available to picking, bounds, fog and animation systems.
export const UNIT_PICK_LAYER = 31;

function materialKey(m) {
  return [m.type,m.color.getHex(),m.emissive?.getHex(),m.emissiveIntensity,m.opacity,
    m.transparent,m.side,m.depthWrite,m.depthTest,m.alphaTest,m.blending,m.roughness,
    m.metalness,m.flatShading,m.vertexColors,m.wireframe,m.envMapIntensity,m.toneMapped,
    m.fog,m.forceSinglePass,m.polygonOffset,m.polygonOffsetFactor,m.polygonOffsetUnits,
    ...['map','alphaMap','normalMap','roughnessMap','metalnessMap','emissiveMap','envMap','gradientMap','bumpMap'].map(k=>m[k]?.uuid||'')].join('/');
}

class Batch {
  constructor(scene,part,geometry,key,frame) {
    this.scene=scene;this.geometry=geometry;this.material=part.material.clone();
    this.castShadow=part.castShadow;this.receiveShadow=part.receiveShadow;
    this.key=key;this.capacity=0;this.count=0;this.lastUsed=frame;
    this.grow();
  }
  grow() {
    const old=this.mesh;
    this.capacity=Math.max(32,this.capacity*2);
    this.mesh=new THREE.InstancedMesh(this.geometry,this.material,this.capacity);
    this.mesh.name='Unit model batch';this.mesh.castShadow=this.castShadow;
    this.mesh.receiveShadow=this.receiveShadow;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if(old){this.mesh.instanceMatrix.array.set(old.instanceMatrix.array);this.scene.remove(old);old.dispose();}
    this.scene.add(this.mesh);
  }
  append(matrix,frame) {
    if(this.count===this.capacity)this.grow();
    this.mesh.setMatrixAt(this.count++,matrix);this.lastUsed=frame;
  }
  flush() {
    this.mesh.count=this.count;this.mesh.visible=this.count>0;
    if(!this.count)return;
    this.mesh.instanceMatrix.needsUpdate=true;
    this.mesh.computeBoundingSphere();
  }
  dispose(){this.scene.remove(this.mesh);this.mesh.dispose();this.material.dispose();}
}

/** Batch authored unit meshes by shared geometry and current material state.
 * Read the live part matrix, rather than a static template: nested animation,
 * team tint, camo, fog opacity, garrison visibility and model offsets survive.
 * Tactical overlays retain their source transforms and visibility; supported
 * primitive overlays and ground shadows use geometry owned by this renderer.
 */
export class UnitModelBatcher {
  constructor(scene,camera) {
    this.scene=scene;this.camera=camera;this.enabled=true;
    this.entities=new Map();this.batches=new Map();this.frame=0;
    this.stats={instanceCount:0,batchCount:0,drawCalls:0};
    this._materials=new WeakMap();
    this._overlayGeometry=new Map();
  }
  overlayGeometry(part) {
    const key=part.geometry.type+'/'+JSON.stringify(part.geometry.parameters);
    if(!this._overlayGeometry.has(key))this._overlayGeometry.set(key,part.geometry.clone());
    return this._overlayGeometry.get(key);
  }
  addEntity(entity) {
    if(!entity.isUnit||!entity.mesh||this.entities.has(entity.id))return;
    const roots=[];
    entity.mesh.traverse(o=>{if(o.userData.assetKey?.startsWith('unit_'))roots.push(o);});
    const parts=[],seen=new Set();
    for(const root of roots)root.traverse(part=>{
      if(!part.isMesh||part.isSkinnedMesh||!part.material?.isMeshStandardMaterial||seen.has(part))return;
      if(Object.keys(part.geometry.morphAttributes).length)return;
      seen.add(part);parts.push({part,mask:part.layers.mask});
    });
    if(!parts.length)return;
    entity.mesh.traverse(part=>{
      if(!seen.has(part)&&part.isMesh&&(part.material?.isMeshBasicMaterial||part.material?.isMeshToonMaterial)&&
          ['PlaneGeometry','RingGeometry','OctahedronGeometry'].includes(part.geometry.type)) {
        parts.push({part,mask:part.layers.mask,geometry:this.overlayGeometry(part)});
      }
    });
    this.entities.set(entity.id,{entity,parts,shadow:null});entity._instancedRendering=true;
    if(this.enabled)for(const {part}of parts)part.layers.set(UNIT_PICK_LAYER);
  }
  removeEntity(entity) {
    const entry=this.entities.get(entity.id);if(!entry)return;
    for(const {part,mask}of entry.parts)part.layers.mask=mask;
    entity._instancedRendering=false;this.entities.delete(entity.id);
  }
  hasEntity(id){return this.entities.has(id);}
  update() {
    this.frame++;
    for(const batch of this.batches.values())batch.count=0;
    for(const entry of this.entities.values()) {
      const {entity,parts}=entry;
      if(entity._shadow!==entry.shadow){
        if(entry.shadow){const index=parts.findIndex(p=>p.part===entry.shadow);if(index!==-1){entry.shadow.layers.mask=parts[index].mask;parts.splice(index,1);}}
        entry.shadow=entity._shadow||null;
        if(entry.shadow)parts.push({part:entry.shadow,mask:entry.shadow.layers.mask,geometry:this.overlayGeometry(entry.shadow)});
      }
      entity.mesh.updateWorldMatrix(true,true);
      entry.shadow?.updateWorldMatrix(true,false);
      for(const {part,mask,geometry=part.geometry}of parts) {
        part.layers.mask=this.enabled?(1<<UNIT_PICK_LAYER):mask;
        if(!this.enabled||!entity.alive||entity.isGarrisoned||!entity.mesh.visible||!part.material.visible)continue;
        let visible=true,attached=part===entry.shadow;
        for(let node=part;node;node=node.parent){if(node===entity.mesh)attached=true;if(!node.visible){visible=false;break;}}
        if(!visible||!attached)continue;
        const m=part.material;
        const signature=materialKey(m);
        let cached=this._materials.get(m);
        const shadows=part.castShadow+'/'+part.receiveShadow;
        if(!cached||cached.signature!==signature||cached.geometry!==geometry||cached.shadows!==shadows){cached={signature,geometry,shadows,key:geometry.uuid+'/'+signature+'/'+shadows};this._materials.set(m,cached);}
        let batch=this.batches.get(cached.key);
        if(!batch){batch=new Batch(this.scene,part,geometry,cached.key,this.frame);this.batches.set(cached.key,batch);}
        batch.append(part.matrixWorld,this.frame);
      }
    }
    let draws=0;
    for(const [key,batch]of this.batches){
      if(!batch.count&&this.frame-batch.lastUsed>120){batch.dispose();this.batches.delete(key);continue;}
      batch.flush();if(batch.count)draws++;
    }
    this.stats={instanceCount:this.entities.size,batchCount:this.batches.size,drawCalls:draws};
  }
  getStats(){return {...this.stats};}
  dispose() {
    for(const {entity}of [...this.entities.values()])this.removeEntity(entity);
    for(const batch of this.batches.values())batch.dispose();
    this.batches.clear();this._materials=new WeakMap();
    for(const geometry of this._overlayGeometry.values())geometry.dispose();
    this._overlayGeometry.clear();
  }
}
