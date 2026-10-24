import {DAMAGE_MODIFIERS,BUILDING_STATS} from '../core/Constants.js';
import {Vector3} from 'three';

export function automaticTargetScore(unit,enemy,distance,remainingHealth){
 const key=enemy.isBuilding?'building':enemy.type;
 const effectiveness=DAMAGE_MODIFIERS[unit.type]?.[key]??1;
 const incomingEffectiveness=DAMAGE_MODIFIERS[enemy.type]?.[unit.type]??1;
 const threat=Math.min(3,(enemy.damage??0)*Math.max(.5,enemy.attackRate??1)*incomingEffectiveness/25);
 const retaliating=enemy.attackTarget?.id===unit.id? .7:0;
 const finishing=remainingHealth<=Math.max(1,unit.damage*effectiveness)? .35:0;
 return effectiveness*2+threat*1.6+retaliating+finishing-distance/Math.max(1,unit.range*3);
}

// Bounded command-time planning: rally outside buildings, away from enemy pressure.
export function retreatDestination(unit,game){
 const position=unit.getPosition(),terrain=game.terrain,paths=game.pathfinding;
 const buildings=game.getBuildings(unit.team).filter(b=>b.alive&&!b._constructing).sort((a,b)=>position.distanceToSquared(a.getPosition())-position.distanceToSquared(b.getPosition())||a.id-b.id).slice(0,8);
 const candidates=[];
 for(const building of buildings){
  const center=building.getPosition(),radius=(BUILDING_STATS[building.type]?.size??2)*2.5+5+(unit.id%3)*2;
  const enemies=game.spatialGrid?.query(center.x,center.z,45)??[];
  let pressure=0;
  for(const enemy of enemies)if(enemy.alive&&enemy.team!==unit.team&&enemy.team!=='neutral'&&enemy.damage>0)pressure+=Math.min(3,enemy.damage/15);
  const angle=Math.atan2(position.z-center.z,position.x-center.x);
  for(let i=0;i<8;i++){
   const a=angle+i*Math.PI/4,x=center.x+Math.cos(a)*radius,z=center.z+Math.sin(a)*radius;
   if(terrain&&(x<0||z<0||x>=terrain.worldSize||z>=terrain.worldSize))continue;
   if(unit.domain!=='air'&&terrain&&paths?.isPassable){const grid=terrain.worldToGrid(x,z);if(!paths.isPassable(grid.x,grid.z,unit.domain))continue;}
   const target=new Vector3(x,terrain?.getHeightAt(x,z)??0,z);
   candidates.push({target,score:position.distanceTo(target)+pressure*25,id:building.id,slot:i});
  }
 }
 candidates.sort((a,b)=>a.score-b.score||a.id-b.id||a.slot-b.slot);
 // Try separate buildings first so one inaccessible base cannot consume all retries.
 const checked=new Set();let attempts=0;
 for(const candidate of candidates){
  if(checked.has(candidate.id))continue;checked.add(candidate.id);
  if(unit.domain==='air'||!paths?.findPathForDomain)return candidate.target;
  if(++attempts>3)break;
  const route=paths.findPathForDomain(position,candidate.target,unit.domain);
  if(route?.length && route.at(-1).distanceTo(candidate.target)<5)return candidate.target;
 }
 return null;
}
