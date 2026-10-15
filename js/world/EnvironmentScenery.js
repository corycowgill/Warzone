import * as THREE from 'three';
import {assetManager} from '../rendering/AssetManager.js';

// Each material part becomes one instanced draw, rather than a clone per tree/blade.
export function addEnvironmentScenery(terrain, group) {
  let state=(terrain.seed^0x58a91)>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const placements=new Map();
  const add=(key,x,z,scale=1,angle=random()*Math.PI*2,y=null)=>{
    // Only dense ground dressing benefits from subdivision; preserve cheap tree batches.
    const chunk = key==='env_grass'||key==='env_reeds'
      ? `${key}:${Math.floor(x/64)}:${Math.floor(z/64)}` : key;
    if(!placements.has(chunk))placements.set(chunk,{key,items:[]});
    placements.get(chunk).items.push({x,z,y:y??terrain.getHeightAt(x,z),scale,angle});
  };
  const treeKeys=terrain.biome==='desert'?['tree_palm']:terrain.biome==='arctic'?['tree_cone','tree_fat']:['tree_oak','tree_default','tree_detailed','tree_cone'];
  for(const tree of terrain.treePositions){const p=terrain.gridToWorld(tree.x,tree.z);add(treeKeys[Math.floor(random()*treeKeys.length)],p.x,p.z,tree.scale);}
  const cliffs=[];
  for(const cliff of terrain.cliffPositions){
    if(cliffs.length>=48)break;
    const p=terrain.gridToWorld(cliff.x,cliff.z);
    if(cliffs.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<5))continue;
    cliffs.push(p);add('env_cliff',p.x,p.z,.65+random()*.5,random()*Math.PI*2,cliff.height-.6);
    // Peaks remain on blocked high ground, away from starting areas.
    if(cliff.height>4.0&&cliffs.length%9===0&&p.x>65&&p.x<terrain.worldSize-65)add('env_mountain',p.x,p.z,.6,random()*Math.PI*2,cliff.height-1.4);
  }
  for(let i=0;i<1500;i++){
    const x=4+random()*(terrain.worldSize-8),z=4+random()*(terrain.worldSize-8),h=terrain.getHeightAt(x,z);
    const gx=Math.floor(x/terrain.worldScale),gz=Math.floor(z/terrain.worldScale);
    const slope=Math.abs(h-terrain.getHeightAt(x+1,z))+Math.abs(h-terrain.getHeightAt(x,z+1));
    if(h>.35&&h<5&&slope<.7&&terrain.walkableGrid[gz]?.[gx]){
      // Small dressing has no collision, and remains below tactical silhouettes.
      const key=i%47===0?'env_boulder':i%37===0?'env_bush':i%73===0?'env_stump':i%97===0?'env_fallen_log':'env_grass';
      if(terrain.biome==='arctic'&&key==='env_grass')continue;
      add(key,x,z,key==='env_grass'?.45+random()*.45:.35+random()*.4);
    }else if(h>-.05&&h<.5&&terrain.biome!=='arctic'&&i%3===0)add('env_reeds',x,z,.55+random()*.4);
  }
  const dummy=new THREE.Object3D();let draws=0,instances=0;
  const templates = new Map();
  for(const {key,items} of placements.values()){
    if (!templates.has(key)) templates.set(key,assetManager.getScaledModel(key));
    const model=templates.get(key);if(!model)continue;
    model.updateMatrixWorld(true);
    model.traverse(part=>{
      if(!part.isMesh)return;
      const geometry=part.geometry.clone().applyMatrix4(part.matrixWorld);
      const material=part.material.clone();
      if(key==='env_grass'||key==='env_reeds')material.side=THREE.DoubleSide;
      if(terrain.biome==='arctic'&&material.name.startsWith('Foliage'))material.color.lerp(new THREE.Color(0xb7c7c3),.58);
      const batch=new THREE.InstancedMesh(geometry,material,items.length);batch.name='Scenery / '+key;batch.userData.environmentAsset=key;
      batch.castShadow=key!=='env_grass'&&key!=='env_reeds';batch.receiveShadow=true;
      items.forEach((p,i)=>{dummy.position.set(p.x,p.y-.025,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});
      batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();group.add(batch);draws++;instances+=items.length;
    });
  }
  group.userData.scenery={draws,instances,assets:[...new Set([...placements.values()].map(p=>p.key))]};
  for (const model of templates.values()) model?.traverse(part=>{if(part.isMesh)part.material.dispose();});
  addForestFloor(terrain,group);
}

function addForestFloor(terrain,group){
  // Soft-edged ground decals, baked to heightfield vertices to avoid floating planes.
  const vertices=[],uvs=[],indices=[];
  for(const tree of terrain.treePositions){
    const center=terrain.gridToWorld(tree.x,tree.z),radius=tree.scale*1.8,start=vertices.length/3;
    const count=12;
    vertices.push(center.x,terrain.getHeightAt(center.x,center.z)+.035,center.z);uvs.push(.5,.5);
    for(let i=0;i<=count;i++){const angle=i/count*Math.PI*2,x=center.x+Math.cos(angle)*radius,z=center.z+Math.sin(angle)*radius;vertices.push(x,terrain.getHeightAt(x,z)+.035,z);uvs.push(.5+Math.cos(angle)*.5,.5+Math.sin(angle)*.5);if(i<count)indices.push(start,start+i+2,start+i+1);}
  }
  if(!indices.length)return;
  const alpha=new Uint8Array(32*32*4);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const value=Math.round(Math.max(0,1-Math.hypot(x-15.5,y-15.5)/15.5)*255);const i=(y*32+x)*4;alpha[i]=alpha[i+1]=alpha[i+2]=value;alpha[i+3]=255;}
  const texture=new THREE.DataTexture(alpha,32,32);texture.needsUpdate=true;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:terrain.biome==='arctic'?0x84928b:0x584c31,alphaMap:texture,transparent:true,opacity:.42,roughness:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  material.userData.preservePBR=true;const mesh=new THREE.Mesh(geometry,material);mesh.name='Forest floor decals';mesh.receiveShadow=true;group.add(mesh);
}
