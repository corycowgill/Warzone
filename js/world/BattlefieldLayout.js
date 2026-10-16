import * as THREE from 'three';

// Shared grid-space trail definition: generation, dressing and material use it.
export function trailZ(x,size,lane){
  const t=THREE.MathUtils.clamp((x-15)/(size-45),0,1);
  return size*.5+lane*size*(.205*Math.sin(t*Math.PI)+.022*Math.sin(t*Math.PI*3)+.01*Math.sin(t*Math.PI*7));
}
export function trailDistance(x,z,size){
  if(x<12||x>size-27)return Infinity;
  return Math.min(Math.abs(z-trailZ(x,size,-1)),Math.abs(z-trailZ(x,size,1)));
}

export function generateBattlefield(terrain){
  const n=terrain.mapSize,rng=terrain.rng,template=terrain.mapTemplate;
  const phase=rng()*Math.PI*2;
  const riverX=z=>n*.5+Math.sin(z/n*Math.PI*2+phase)*n*.055+Math.sin(z/n*Math.PI*5+phase)*n*.018;
  const coast=z=>n*(.76+.055*Math.sin(z/n*Math.PI*3+phase)+.025*Math.cos(z/n*Math.PI*7));
  const peaks=[{x:n*.38,z:n*.16,rx:13,rz:8,h:12},{x:n*.64,z:n*.83,rx:15,rz:9,h:14},
    {x:n*.18,z:n*.84,rx:9,rz:11,h:9},{x:n*.83,z:n*.14,rx:12,rz:10,h:11}];
  if(template==='islands'){
    peaks[0].x=n*.48;peaks[0].z=n*.2;peaks[1].x=n*.48;peaks[1].z=n*.81;
    peaks[2].x=n*.16;peaks[2].z=n*.3;peaks[3].x=n*.78;peaks[3].z=n*.7;
  }
  for(const p of peaks){p.x+=(rng()-.5)*8;p.z+=(rng()-.5)*6;p.h*=.9+rng()*.2;}
  terrain.landmarks=peaks.map((p,i)=>({...p,label:['Northern escarpment','Southern ridge','Western bluff','Eastern headland'][i]}));
  const islands=[{x:20,z:n*.5,rx:29,rz:35},{x:n-30,z:n*.5,rx:29,rz:34},
    {x:n*.48,z:n*.2,rx:20,rz:15},{x:n*.48,z:n*.81,rx:19,rz:16}];
  for(let z=0;z<=n;z++)for(let x=0;x<=n;x++){
    let h=2.2+terrain.fbm(x,z,3,.035)*1.4;
    // Broad ridges and shoulders give each area a readable silhouette.
    let relief=0;
    for(const p of peaks){
      const d=Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz);
      relief+=p.h*(1-THREE.MathUtils.smoothstep(d,.15,1.65));
    }
    h+=relief;
    if(template==='continental'){
      const d=x-coast(z);
      const shelf=THREE.MathUtils.smoothstep(d,-9,8);
      h=THREE.MathUtils.lerp(h,-3.8,shelf);
    }else if(template==='river'){
      const d=Math.abs(x-riverX(z));
      h=THREE.MathUtils.lerp(-2.8,h,THREE.MathUtils.smoothstep(d,3.1,8));
      // Two broad, visible fords align with the flanking trails.
      const crossing=Math.min(Math.abs(z-trailZ(x,n,-1)),Math.abs(z-trailZ(x,n,1)));
      if(crossing<3.6)h=THREE.MathUtils.lerp(h,1.7,1-THREE.MathUtils.smoothstep(crossing,2,3.6));
    }else if(template==='islands'){
      let land=-5;
      const warp=terrain.fbm(x+271,z-127,2,.065)*.12;
      for(const island of islands){
        const angle=Math.atan2(z-island.z,x-island.x);
        const shape=1+.1*Math.sin(angle*3+phase)+.065*Math.sin(angle*5-phase);
        const d=Math.hypot((x-island.x)/island.rx,(z-island.z)/island.rz)*shape+warp;
        land=Math.max(land,THREE.MathUtils.lerp(3+relief*.65,-5,THREE.MathUtils.smoothstep(d,.66,1.22)));
      }
      h=land;
    }else{
      // Two off-axis ponds interrupt open country without sealing the lanes.
      const pond=Math.min(Math.hypot((x-n*.43)/9,(z-n*.42)/7),Math.hypot((x-n*.64)/10,(z-n*.52)/8));
      h=THREE.MathUtils.lerp(-1.8,h,THREE.MathUtils.smoothstep(pond,.35,1.2));
    }
    if(template!=='islands'){
      const d=trailDistance(x,z,n);
      if(d<3.5)h=THREE.MathUtils.lerp(h,2,1-THREE.MathUtils.smoothstep(d,2,3.5));
    }
    terrain.setHeightAndWalkable(x,z,h);
  }
  // Keep only land landmarks; do not place rock masses out in open sea.
  terrain.landmarks=terrain.landmarks.filter(p=>terrain.heightData[Math.round(p.z)][Math.round(p.x)]>4);
  terrain.ensureStartingAreas();
  for(const p of terrain.landmarks){
    for(let z=Math.floor(p.z)-3;z<=Math.ceil(p.z)+3;z++)for(let x=Math.floor(p.x)-3;x<=Math.ceil(p.x)+3;x++){
      if(terrain.walkableGrid[z]?.[x]!==undefined&&Math.hypot(x-p.x,z-p.z)<3)terrain.walkableGrid[z][x]=0;
    }
  }
}
