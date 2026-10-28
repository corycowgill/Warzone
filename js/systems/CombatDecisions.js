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

// Prefer recovery facilities and evaluate exposure at the actual rally point.
export function retreatDestination(unit, game) {
  const position = unit.getPosition(), terrain = game.terrain, paths = game.pathfinding;
  const wounded = unit.health < unit.maxHealth * .7;
  const buildings = game.getBuildings(unit.team).filter(b => b.alive && !b._constructing)
    .sort((a,b) => position.distanceToSquared(a.getPosition()) - position.distanceToSquared(b.getPosition()) || a.id-b.id);
  // A distant HQ must not disappear from the bounded candidate set behind eight depots.
  const recoveryHQ = wounded ? buildings.find(b => b.type === 'headquarters') : null;
  const nearby = buildings.slice(0,8);
  if (recoveryHQ && !nearby.includes(recoveryHQ)) nearby[nearby.length-1] = recoveryHQ;
  const candidates = [];
  for (const building of nearby) {
    const center = building.getPosition();
    const radius = (BUILDING_STATS[building.type]?.size ?? 2)*2.5 + 5 + (unit.id%3)*2;
    const fog = game.fogOfWar;
    const enemies = (game.spatialGrid?.query(center.x,center.z,80) ?? []).filter(enemy => {
      if (!enemy.alive || enemy.team === unit.team || enemy.team === 'neutral' || !(enemy.damage > 0)) return false;
      if (enemy.isStealthed?.()) return false;
      const pos = enemy.getPosition?.();
      // A local retreat order must not reveal unseen enemy positions through its choice.
      return !pos || !fog || fog.team !== unit.team || fog.isVisible(pos.x,pos.z) || enemy._combatRevealTimer > 0;
    });
    const angle = Math.atan2(position.z-center.z,position.x-center.x);
    for (let i=0;i<8;i++) {
      const a=angle+i*Math.PI/4, x=center.x+Math.cos(a)*radius, z=center.z+Math.sin(a)*radius;
      if (terrain && (x<0 || z<0 || x>=terrain.worldSize || z>=terrain.worldSize)) continue;
      if (unit.domain !== 'air' && terrain && paths?.isPassable) {
        const grid=terrain.worldToGrid(x,z);
        if (!paths.isPassable(grid.x,grid.z,unit.domain)) continue;
      }
      const target = new Vector3(x,terrain?.getHeightAt(x,z) ?? 0,z);
      let exposure=0;
      for (const enemy of enemies) {
        const enemyPos=enemy.getPosition?.();
        if (!enemyPos) { exposure+=Math.min(3,enemy.damage/15)*25; continue; }
        const distance=target.distanceTo(enemyPos), reach=(enemy.range ?? 10)*3+8;
        exposure+=Math.max(0,1-distance/reach)*Math.min(3,enemy.damage/15)*70;
      }
      const recoveryBonus=wounded && building.type === 'headquarters' ? 30 : 0;
      candidates.push({target,score:position.distanceTo(target)+exposure-recoveryBonus,id:building.id,slot:i});
    }
  }
  candidates.sort((a,b)=>a.score-b.score || a.id-b.id || a.slot-b.slot);
  // Try distinct bases first, then one alternate approach per base. Six route probes maximum.
  const bases=[...new Set(candidates.map(c=>c.id))].slice(0,3);
  const choices=bases.map(id=>candidates.find(c=>c.id===id));
  choices.push(...bases.map(id=>candidates.filter(c=>c.id===id)[1]).filter(Boolean));
  for (const candidate of choices) {
    if (unit.domain === 'air' || !paths?.findPathForDomain) return candidate.target;
    const route=paths.findPathForDomain(position,candidate.target,unit.domain);
    if (route?.length && route.at(-1).distanceTo(candidate.target)<5) return candidate.target;
  }
  return null;
}
