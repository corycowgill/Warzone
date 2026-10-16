import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {assetManager,AssetManager} from '../js/rendering/AssetManager.js';
import {Terrain} from '../js/world/Terrain.js';
const entries=Object.entries(AssetManager.MANIFEST).filter(([k])=>/^(tree_|env_|prop_)/.test(k));assert.equal(entries.length,26);
let total=0;
for(const [key,info] of entries){assert.ok(info.path.includes('environment/warzone-original/'));const b=await readFile(new URL('../'+info.path,import.meta.url));total+=b.length;const gltf=await assetManager.loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');assetManager.cache.set(key,{scene:gltf.scene,animations:[]});const model=assetManager.getScaledModel(key);assetManager.applyToonShading(model);let tris=0;model.traverse(o=>{if(o.isMesh){assert.ok(o.material.isMeshStandardMaterial);tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));}});assert.ok(tris<=12000&&b.length<1500000,key);}
for(const map of ['continental','river','islands','plains'])for(const biome of ['temperate','desert','arctic']){
 const terrain=new Terrain({},map,6819,biome);assert.ok(terrain.mesh.userData.scenery.draws>0&&terrain.mesh.userData.scenery.draws<75);
 let batches=0;terrain.mesh.traverse(o=>{if(o.isInstancedMesh){batches++;assert.ok(Number.isFinite(o.boundingSphere.radius));for(let i=0;i<o.count;i++){const m=new THREE.Matrix4();o.getMatrixAt(i,m);assert.ok(m.elements.every(Number.isFinite));}}});assert.equal(batches,terrain.mesh.userData.scenery.draws);
 const before=terrain.waterMaterial.uniforms.uTime.value;terrain.updateWater(.5,new THREE.PerspectiveCamera());assert.equal(terrain.waterMaterial.uniforms.uTime.value,before+.5);
 assert.equal(terrain.waterMaterial.uniforms.uHeight.value.image.width,129);
 const sun=new THREE.DirectionalLight(0xffdda0,1.85);sun.position.set(150,150,100);
 terrain.updateWater(0,new THREE.PerspectiveCamera(),sun);
 const uniforms=terrain.waterMaterial.uniforms;
 assert.ok(Math.abs(uniforms.uSunDirection.value.length()-1)<1e-6);
 const daylight=uniforms.uLight.value;
 sun.intensity=.65;sun.color.set(0x8899bb);terrain.updateWater(0,null,sun);
 assert.ok(uniforms.uLight.value<daylight,'water dims with the day/night sun');
 assert.ok(uniforms.uSunColor.value.equals(sun.color));
 const same=new Terrain({},map,6819,biome);
 assert.deepEqual(same.heightData,terrain.heightData,'seeded terrain remains deterministic');
 assert.deepEqual(same.walkableGrid,terrain.walkableGrid,'scenery does not change collision');
 same.dispose();terrain.dispose();
 console.log(map,biome,batches+' batches');
}
console.log(`PASS: 26 environment GLBs (${(total/1048576).toFixed(2)} MiB), 12 terrain/biome combinations, instancing and height-driven water.`);

globalThis.localStorage={getItem:()=>null,setItem(){}};
const {Game}=await import('../js/core/Game.js');
const game={sceneManager:{scene:new THREE.Scene()},terrain:{getHeightAt:()=>2},rng:{next:()=>.5},addEntity(entity){this.lastEntity=entity;}};
const resource=Game.prototype._createResourceNode.call(game,10,2,20,0);
let resourceAsset=false;resource.mesh.traverse(o=>{if(o.userData.assetKey==='env_resource_outcrop')resourceAsset=true;});assert.ok(resourceAsset,'actual resource node uses GLB');
const cache=Game.prototype.createSupplyCache.call(game,12,24,150);
let cacheAsset=false;cache.mesh.traverse(o=>{if(o.userData.assetKey==='env_supply_cache')cacheAsset=true;});assert.ok(cacheAsset,'actual supply pickup uses GLB');assert.equal(cache._cacheReward,150);
console.log('Game resource node and supply-cache integration passed.');
