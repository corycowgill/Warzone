import * as THREE from 'three';
import {FORMATION_CONFIG} from '../core/Constants.js';
// Closest alternatives first, shared by every slot rather than scanning square corners.
const alternatives=[];
for(let z=-12;z<=12;z++)for(let x=-12;x<=12;x++)alternatives.push({x,z,d:x*x+z*z});
alternatives.sort((a,b)=>a.d-b.d||a.z-b.z||a.x-b.x);
// Allocate near-side slots first and match each to its closest remaining unit.
export function planFormation(units,position,offsets,heading,game){
  const pending=[...units].sort((a,b)=>a.id-b.id),reserved=[];
  const cos=Math.cos(heading),sin=Math.sin(heading),terrain=game.terrain;
  const scale=terrain?.worldScale??2;
  const spacing=Math.max(FORMATION_CONFIG.spacing,...units.map(u=>(FORMATION_CONFIG.unitRadius?.[u.type]??1.5)*2+.4));
  const multiplier=spacing/FORMATION_CONFIG.spacing;
  const slots=offsets.map(o=>new THREE.Vector3(position.x+(o.x*cos+o.z*sin)*multiplier,0,position.z+(-o.x*sin+o.z*cos)*multiplier));
  const center=units.reduce((p,u)=>p.add(u.getPosition()),new THREE.Vector3()).multiplyScalar(1/units.length);
  slots.sort((a,b)=>a.distanceToSquared(center)-b.distanceToSquared(center));
  const plans=[];
  for(const slot of slots){
    pending.sort((a,b)=>a.getPosition().distanceToSquared(slot)-b.getPosition().distanceToSquared(slot)||a.id-b.id);
    const unit=pending.shift();let target=null;
    const radius=FORMATION_CONFIG.unitRadius?.[unit.type]??1.5;
    const valid=(x,z)=>{
      if(terrain&&(x<0||z<0||x>=terrain.worldSize||z>=terrain.worldSize))return false;
      if(unit.domain!=='air'&&game.pathfinding?.isPassable){const grid=terrain.worldToGrid(x,z);if(!game.pathfinding.isPassable(grid.x,grid.z,unit.domain))return false;}
      return !reserved.some(p=>Math.hypot(p.x-x,p.z-z)<radius+p.radius+.2);
    };
    for(const offset of alternatives){
      const x=slot.x+offset.x*scale,z=slot.z+offset.z*scale;
      if(valid(x,z)){target=new THREE.Vector3(x,terrain?.getHeightAt(x,z)??0,z);break;}
    }
    if(target){reserved.push({x:target.x,z:target.z,radius});plans.push({unit,target});}
    else game.eventBus?.emit('command:blocked',{unit,position:slot});
  }
  return plans;
}
