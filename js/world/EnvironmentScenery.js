import * as THREE from 'three';
import {assetManager} from '../rendering/AssetManager.js';

// Each material part becomes one instanced draw, rather than a clone per tree/blade.
export function addEnvironmentScenery(terrain, group) {
  let state=(terrain.seed^0x58a91)>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const placements=new Map();
  terrain.sceneryWind={time:{value:0},strength:{value:1}};
  const add=(key,x,z,scale=1,angle=random()*Math.PI*2,y=null)=>{
    // Only dense ground dressing benefits from subdivision; preserve cheap tree batches.
    const chunk = key==='env_grass'||key==='env_reeds'
      ? `${key}:${Math.floor(x/64)}:${Math.floor(z/64)}` : key;
    if(!placements.has(chunk))placements.set(chunk,{key,items:[]});
    placements.get(chunk).items.push({x,z,y:y??terrain.getHeightAt(x,z),scale,angle});
  };
  const treeKeys=terrain.biome==='desert'?['tree_palm']:terrain.biome==='arctic'?['tree_cone','tree_fat']:['tree_oak','tree_default','tree_detailed','tree_cone'];
  for(const tree of terrain.treePositions){const p=terrain.gridToWorld(tree.x,tree.z);add(treeKeys[Math.floor(random()*treeKeys.length)],p.x,p.z,tree.scale*1.22);}
  const cliffs=[];
  for(const cliff of terrain.cliffPositions){
    if(cliffs.length>=48)break;
    const p=terrain.gridToWorld(cliff.x,cliff.z);
    if(cliffs.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<5))continue;
    cliffs.push(p);add('env_cliff',p.x,p.z,.65+random()*.5,random()*Math.PI*2,cliff.height-.6);
    // Peaks remain on blocked high ground, away from starting areas.
    if(cliff.height>4.0&&cliffs.length%9===0&&p.x>65&&p.x<terrain.worldSize-65)add('env_mountain',p.x,p.z,.6,random()*Math.PI*2,cliff.height-1.4);
  }
  // Clusters read as habitats rather than evenly scattered individual props.
  // Small non-colliding details avoid the initial construction clearings.
  const suitable=(x,z,min=.4,max=5)=>{
    if(x<3||z<3||x>terrain.worldSize-3||z>terrain.worldSize-3)return false;
    if(Math.hypot(x-30,z-terrain.worldSize/2)<24||Math.hypot(x-(terrain.mapSize-30)*terrain.worldScale,z-terrain.worldSize/2)<24)return false;
    const h=terrain.getHeightAt(x,z);
    return h>min&&h<max&&Math.abs(h-terrain.getHeightAt(x+1,z))+Math.abs(h-terrain.getHeightAt(x,z+1))<.7;
  };
  for(let i=0;i<200;i++){
    const x=4+random()*(terrain.worldSize-8),z=4+random()*(terrain.worldSize-8);
    const shore=suitable(x,z,-.12,.5);
    const meadow=suitable(x,z)&&terrain.walkableGrid[Math.floor(z/terrain.worldScale)]?.[Math.floor(x/terrain.worldScale)];
    if(!shore&&!meadow)continue;
    const count=terrain.biome==='arctic'?2:shore?7:12;
    for(let j=0;j<count;j++){
      const angle=random()*Math.PI*2,r=Math.sqrt(random())*(shore?2.4:4.5);
      const px=x+Math.cos(angle)*r,pz=z+Math.sin(angle)*r;
      if(!suitable(px,pz,shore?-.12:.4,shore?.55:5))continue;
      const key=shore?(j%3===0?'env_boulder':'env_reeds'):
        terrain.biome==='arctic'?'env_boulder':j===0?'env_bush':'env_grass';
      if(terrain.biome==='arctic'&&key==='env_reeds')continue;
      add(key,px,pz,key==='env_boulder'?.08+random()*.18:key==='env_bush'?.35+random()*.25:.4+random()*.5);
    }
  }
  for(const tree of terrain.treePositions){
    const center=terrain.gridToWorld(tree.x,tree.z);
    for(let i=0;i<8;i++){
      const angle=random()*Math.PI*2,r=1+random()*3.5;
      const x=center.x+Math.cos(angle)*r,z=center.z+Math.sin(angle)*r;
      if(!suitable(x,z))continue;
      const key=i===0?'env_fallen_log':i===1?'env_stump':terrain.biome==='arctic'?'env_boulder':i===2?'env_bush':'env_grass';
      add(key,x,z,key==='env_boulder'?.12+random()*.2:.3+random()*.35);
    }
  }
  for(const cliff of cliffs){
    for(let i=0;i<5;i++){
      const a=random()*Math.PI*2,r=1.5+random()*3;
      const x=cliff.x+Math.cos(a)*r,z=cliff.z+Math.sin(a)*r;
      if(suitable(x,z,.3,9))add('env_boulder',x,z,.12+random()*.3);
    }
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
      if(key==='env_grass'||key==='env_reeds'){
        material.side=THREE.DoubleSide;
        material.onBeforeCompile=shader=>{
          shader.uniforms.uSceneryTime=terrain.sceneryWind.time;
          shader.uniforms.uSceneryWind=terrain.sceneryWind.strength;
          shader.vertexShader='uniform float uSceneryTime,uSceneryWind;\n'+shader.vertexShader;
          shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
            #ifdef USE_INSTANCING
            float phase=instanceMatrix[3].x*.31+instanceMatrix[3].z*.27;
            float bend=sin(uSceneryTime*1.6+phase)*.07+sin(uSceneryTime*2.7+phase*.7)*.025;
            transformed.xz+=vec2(1.,.45)*bend*max(position.y,0.)*uSceneryWind;
            #endif`);
        };
        material.customProgramCacheKey=()=> 'warzone-ground-wind-v1';
      }
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
    const center=terrain.gridToWorld(tree.x,tree.z),radius=tree.scale*3.1,start=vertices.length/3;
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
