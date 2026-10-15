import assert from 'node:assert/strict';
import * as THREE from 'three';
import {UnitModelBatcher,UNIT_PICK_LAYER} from '../js/rendering/UnitModelBatcher.js';
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),renderer=new UnitModelBatcher(scene,camera);
const geometry=new THREE.BoxGeometry(2,2,2),material=new THREE.MeshStandardMaterial({color:0x4488ff});
let nextId=1;
function unit(color=0x4488ff){
 const mesh=new THREE.Group(),model=new THREE.Group();model.userData.assetKey='unit_tank';
 const part=new THREE.Mesh(geometry,material.clone());part.material.color.setHex(color);part.castShadow=true;part.receiveShadow=true;
 part.position.set(1,2,3);model.add(part);model.scale.setScalar(.5);mesh.add(model);scene.add(mesh);
 const selectionRing=new THREE.Mesh(new THREE.RingGeometry(1,2),new THREE.MeshBasicMaterial());selectionRing.visible=false;mesh.add(selectionRing);
 return {id:nextId++,type:'tank',team:'player',isUnit:true,alive:true,mesh,part,model,selectionRing};
}
const first=unit();first.mesh.position.set(10,0,10);renderer.addEntity(first);renderer.update();
assert.equal(renderer.stats.drawCalls,1);assert.equal(first.part.layers.mask,1<<UNIT_PICK_LAYER);
assert.equal(first.selectionRing.layers.mask,1<<UNIT_PICK_LAYER);assert.equal(first.selectionRing.visible,false);
let batch=[...renderer.batches.values()].find(b=>b.count);
const matrix=new THREE.Matrix4();batch.mesh.getMatrixAt(0,matrix);
assert(matrix.elements.every((v,i)=>Math.abs(v-first.part.matrixWorld.elements[i])<1e-6));
first.model.position.y=3;first.mesh.rotation.z=.2;renderer.update();batch.mesh.getMatrixAt(0,matrix);
assert(matrix.elements.every((v,i)=>Math.abs(v-first.part.matrixWorld.elements[i])<1e-5),'nested animation and root rotation preserved');
assert(batch.mesh.boundingSphere.containsPoint(first.part.getWorldPosition(new THREE.Vector3())));
first.model.remove(first.part);renderer.update();assert.equal(renderer.stats.drawCalls,0,'detached parts do not leave ghost instances');
first.model.add(first.part);first.part.castShadow=false;renderer.update();assert([...renderer.batches.values()].some(b=>b.count&&!b.mesh.castShadow));
first.part.castShadow=true;renderer.update();
const second=unit(0xcc4444);renderer.addEntity(second);renderer.update();assert.equal(renderer.stats.drawCalls,2,'team colors have distinct materials');
first.part.material.transparent=true;first.part.material.opacity=.3;renderer.update();
assert([...renderer.batches.values()].some(b=>b.count&&b.material.opacity===.3),'live camouflage opacity retained');
first.mesh.visible=false;renderer.update();assert.equal([...renderer.batches.values()].reduce((n,b)=>n+b.count,0),1,'fog hides all model parts');
first.mesh.visible=true;first.isGarrisoned=true;renderer.update();assert.equal([...renderer.batches.values()].reduce((n,b)=>n+b.count,0),1,'garrison hides model parts');
first.isGarrisoned=false;first.part.material.transparent=false;first.part.material.opacity=1;
const added=[];for(let i=0;i<80;i++){const e=unit();added.push(e);renderer.addEntity(e);}renderer.update();
assert.equal(renderer.stats.drawCalls,2);assert.equal([...renderer.batches.values()].reduce((n,b)=>n+b.count,0),82,'capacity growth preserves all instances');
renderer.removeEntity(added[10]);renderer.update();assert.equal([...renderer.batches.values()].reduce((n,b)=>n+b.count,0),81);assert.equal(added[10].part.layers.mask,1);
renderer.enabled=false;renderer.update();assert.equal(renderer.stats.drawCalls,0);assert.equal(first.part.layers.mask,1);
renderer.enabled=true;renderer.update();
second.mesh.updateMatrixWorld(true);const center=second.part.getWorldPosition(new THREE.Vector3());
const ray=new THREE.Raycaster(center.clone().add(new THREE.Vector3(0,0,10)),new THREE.Vector3(0,0,-1));ray.layers.enable(UNIT_PICK_LAYER);
assert(ray.intersectObject(second.part).length>0,'original model remains pickable on reserved layer');
let disposed=0;geometry.addEventListener('dispose',()=>disposed++);
globalThis.localStorage={getItem:()=>null,setItem(){}};
const {Game}=await import('../js/core/Game.js');
const game={sceneManager:{scene},instancedRenderer:renderer,_corpses:[]};first.alive=false;
Game.prototype._createCorpse.call(game,first);renderer.update();
assert.equal(renderer.hasEntity(first.id),false);assert.equal(first.part.layers.mask,1);assert.notEqual(first.part.geometry,geometry,'corpse owns geometry before later disposal');
assert.equal(game._corpses.length,1);
renderer.dispose();assert.equal(disposed,0,'batch disposal never destroys shared asset geometry');assert.equal(second.part.layers.mask,1);
assert.equal(scene.children.filter(o=>o.isInstancedMesh).length,0);
console.log('PASS model transforms, team tint, camouflage, fog, garrison, capacity growth, removal, picking, corpse ownership and disposal');

const overlays=new UnitModelBatcher(scene,camera),a=unit(),b=unit();
function addOverlays(e){
 e.healthBar=new THREE.Group();e.mesh.add(e.healthBar);e.healthBar.position.y=5;
 for(const [width,height,color]of [[2,.2,0x333333],[2,.2,0x00ff00],[2.2,.4,0x000000]]){
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshToonMaterial({color,side:THREE.DoubleSide}));
  e.healthBar.add(plane);
 }
 e._shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.6}));
 scene.add(e._shadow);overlays.addEntity(e);
}
addOverlays(a);addOverlays(b);overlays.update();assert.equal(overlays.stats.drawCalls,5,'two units share model, three bars and one shadow batch');
const shadowGeometry=overlays._overlayGeometry.get('PlaneGeometry/'+JSON.stringify(a._shadow.geometry.parameters));
assert.notEqual(shadowGeometry,a._shadow.geometry,'batched overlay owns a clone');
a.selectionRing.visible=true;overlays.update();assert.equal(overlays.stats.drawCalls,6,'selection ring visibility retained');
b.healthBar.children[1].scale.x=.4;b.healthBar.children[1].material.color.setHex(0xff0000);overlays.update();
assert([...overlays.batches.values()].some(batch=>batch.count&&batch.material.color.getHex()===0xff0000),'damaged health color preserved');
const before=[...overlays.batches.values()].reduce((sum,batch)=>sum+batch.count,0);
a.mesh.visible=false;overlays.update();assert.equal([...overlays.batches.values()].reduce((sum,batch)=>sum+batch.count,0),before-6,'fog also hides ground shadow and selected overlays');
overlays.dispose();assert.equal(b._shadow.layers.mask,1);assert.equal(b.healthBar.children[0].layers.mask,1);
console.log('PASS health-bar geometry sharing, per-unit fill/color, selection visibility, shadow ownership and fog-hidden overlays');

const {readFile}=await import('node:fs/promises');
const {assetManager,AssetManager}=await import('../js/rendering/AssetManager.js');
const rosterScene=new THREE.Scene(),roster=new UnitModelBatcher(rosterScene,camera);let models=0;
for(const [key,info]of Object.entries(AssetManager.MANIFEST).filter(([key])=>key.startsWith('unit_'))){
 const bytes=await readFile(new URL('../'+info.path,import.meta.url));
 const gltf=await assetManager.loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 assetManager.cache.set(key,{scene:gltf.scene,animations:[]});
 for(const team of ['player','enemy']){
  const mesh=new THREE.Group();mesh.add(assetManager.getTeamTintedModel(key,team));rosterScene.add(mesh);
  const entity={id:nextId++,type:key,team,isUnit:true,alive:true,mesh};roster.addEntity(entity);
  assert(roster.hasEntity(entity.id),key+' supports batching');models++;
 }
}
roster.update();assert.equal(models,36);assert.equal(roster.entities.size,36);
for(const batch of roster.batches.values())assert(Number.isFinite(batch.mesh.boundingSphere.radius));
roster.dispose();console.log('PASS all 18 actual GLB unit assets in both teams, grounding transforms and finite bounds');
const {warmupUnitShaders}=await import('../js/rendering/UnitShaderWarmup.js');
const originalTarget={},colorTarget={},compiled=[];
const gpu={target:originalTarget,getRenderTarget(){return this.target;},setRenderTarget(value){this.target=value;},compileAsync(source){assert.equal(this.target,colorTarget);compiled.push(source);return Promise.resolve();}};
const texture=new THREE.Texture();
const warmed=await warmupUnitShaders(gpu,camera,rosterScene,assetManager,{_shadowTexture:texture,_fireTexture:texture,_smokeTexture:texture,_sparkTexture:texture},colorTarget);
assert.equal(compiled.length,2);assert.equal(gpu.target,originalTarget);assert(compiled[0].children.some(o=>o.isInstancedMesh));
warmed.dispose();assert.equal(compiled[0].children.length,0);assert.equal(disposed,0);
console.log('PASS shader variants compile against the actual color target, preserve render state and release owned resources');
