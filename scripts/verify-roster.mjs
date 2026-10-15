import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {AssetManager} from '../js/rendering/AssetManager.js';
const manager=new AssetManager();
const entries=Object.entries(AssetManager.MANIFEST).filter(([k])=>/^(unit_|bld_)/.test(k));
assert.equal(entries.length,39);
let total=0;
for(const [key,info] of entries){
 assert.ok(info.path.includes('/warzone-original/'),key);
 const bytes=await readFile(new URL('../'+info.path,import.meta.url));total+=bytes.length;
 const gltf=await manager.loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 manager.cache.set(key,{scene:gltf.scene,animations:gltf.animations});
 const models=['player','enemy','neutral'].map(t=>manager.getTeamTintedModel(key,t));
 const materials=models.map(model=>{manager.applyToonShading(model);const mats=new Map();model.traverse(o=>{if(o.isMesh){assert.ok(o.castShadow&&o.receiveShadow);for(const m of Array.isArray(o.material)?o.material:[o.material]){assert.ok(m.isMeshStandardMaterial&&m.userData.preservePBR,key+': PBR survives entity registration');mats.set(m.name,m);}}});return mats;});
 assert.ok(materials[0].has('TeamColor'),key);
 for(const [i,color] of [0x4488ff,0xcc4444,0x8d9586].entries())assert.equal(materials[i].get('TeamColor').color.getHex(),color,key);
 for(const [name,mat] of materials[0]){assert.notEqual(mat,materials[1].get(name));if(name!=='TeamColor')assert.ok(mat.color.equals(materials[1].get(name).color),key+name);}
 let triangles=0,meshes=0;models[0].traverse(o=>{if(o.isMesh){meshes++;const g=o.geometry;triangles+=(g.index?.count??g.attributes.position.count)/3;for(const name of ['position','normal'])assert.ok([...g.attributes[name].array].every(Number.isFinite),key);}});
 assert.ok(triangles<=22000&&meshes<=12&&bytes.length<1500000,key+': budget');
 const bounds=new THREE.Box3().setFromObject(models[0]),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 assert.ok(Math.abs(Math.max(size.x,size.y,size.z)-info.targetSize)<.001,key+': scale');
 assert.ok(Math.abs(bounds.min.y+(info.waterline??0)*info.targetSize)<.001,key+': grounding');
 assert.ok(Math.abs(center.x)<.001&&Math.abs(center.z)<.001,key+': center');
 console.log(`${key}: ${triangles} triangles, ${meshes} meshes, ${bytes.length} bytes`);
}
console.log(`PASS: 18 units, 21 buildings; PBR, team isolation, geometry, grounding and budgets. ${(total/1048576).toFixed(2)} MiB total.`);
