import {UNIT_STATS,DAMAGE_MODIFIERS} from '../core/Constants.js';

export function canEngage(unit,target,distance=Infinity){
  if(!target.alive||target.isGarrisoned||target.isStealthed?.())return false;
  const stats=UNIT_STATS[unit.type];
  if(stats?.airOnly&&target.domain!=='air')return false;
  if(unit.type==='scoutcar'&&target.domain==='air')return false;
  if(distance<(stats?.minRange??0)*3)return false;
  return (DAMAGE_MODIFIERS[unit.type]?.[target.isBuilding?'building':target.type]??1)>0;
}
export const combatPower=u=>Math.max(0,u.damage??0)*(u.attackRate??1)*Math.sqrt(u.maxHealth??100)*Math.max(0,u.health/(u.maxHealth??100));

// Decisions use only observed threats. Reinforcements are local and leave engaged,
// recovering and disabled units alone; ordinary pathfinding validates every order.
export function baseDefense(ai){
  const buildings=ai.game.getBuildings(ai.team).filter(b=>b.alive&&b.type!=='wall');
  const threats=ai.observedEnemies().filter(e=>e.isUnit&&e.damage>0&&buildings.some(b=>e.getPosition().distanceToSquared(b.getPosition())<32*32));
  if(!threats.length)return null;
  const hq=ai.game.getHQ(ai.team);
  threats.sort((a,b)=>(hq?a.getPosition().distanceToSquared(hq.getPosition())-b.getPosition().distanceToSquared(hq.getPosition()):0)||a.id-b.id);
  const target=threats[0],position=target.getPosition();
  const cluster=threats.filter(e=>e.getPosition().distanceToSquared(position)<28*28);
  const units=ai.game.getUnits(ai.team);
  const nearby=u=>u.getPosition().distanceToSquared(position)<75*75;
  const engaged=units.filter(u=>u.alive&&!u.isRetreating&&!u._aiRecovering&&!(u.empDisabledTimer>0)&&nearby(u)&&cluster.some(e=>canEngage(u,e))&&(
    (u.attackTarget?.alive&&u.attackTarget.getPosition().distanceToSquared(position)<28*28)||
    ((u._aiDefenseUntil??0)>ai.gameTime&&u._aiDefensePosition?.distanceToSquared(position)<28*28)
  ));
  let needed=cluster.reduce((sum,u)=>sum+combatPower(u),0)*1.2-engaged.reduce((sum,u)=>sum+combatPower(u),0);
  if(needed<=0)return null;
  const candidates=units.filter(u=>u.alive&&u.damage>0&&u.speed>0&&u.domain!=='naval'&&!u.isGarrisoned&&!u.isRetreating&&!u._aiRecovering&&!u._pathPending&&!u.attackTarget&&!u._siegeMode&&!(u.empDisabledTimer>0)&&u.health/u.maxHealth>.55&&(u._aiRetreatUntil??0)<=ai.gameTime&&(u._aiDefenseUntil??0)<=ai.gameTime&&nearby(u)&&cluster.some(e=>canEngage(u,e)));
  candidates.sort((a,b)=>a.getPosition().distanceToSquared(position)-b.getPosition().distanceToSquared(position)||a.id-b.id);
  const selected=[];
  for(const unit of candidates){selected.push(unit);needed-=combatPower(unit);if(needed<=0||selected.length>=8)break;}
  return selected.length?{units:selected,position:position.clone()}:null;
}
