import * as THREE from 'three';
import {planFormation} from '../systems/FormationPlanner.js';
import {issueUnitMove} from '../systems/MovementOrders.js';
export function readyForWave(unit,time){return unit.alive&&unit.damage>0&&!unit.isGarrisoned&&!unit.isRetreating&&!unit._pathPending&&!unit.attackTarget&&!unit.moveTarget&&unit.speed>0&&!(unit.empDisabledTimer>0)&&!unit._siegeMode&&unit.health/unit.maxHealth>.55&&(unit._aiRetreatUntil??0)<=time&&(unit._aiMissionUntil??0)<=time&&(unit._aiScoutUntil??0)<=time;}
export class AttackWaves {
  constructor(ai){this.ai=ai;this.waves=[];}
  order(units,target,attackMove){
    const ai=this.ai,offsets=units.map((_,i)=>({x:(i%4-1.5)*5,z:Math.floor(i/4)*5}));
    const center=units.reduce((p,u)=>p.add(u.getPosition()),new THREE.Vector3()).multiplyScalar(1/units.length);
    const heading=Math.atan2(target.x-center.x,target.z-center.z),speed=Math.min(...units.map(u=>u.speed));
    const plans=planFormation(units,target,offsets,heading,ai.game);
    for(const {unit,target:slot} of plans)issueUnitMove(unit,slot,ai.game,{attackMove,formationSpeed:speed});
    return plans.map(p=>p.unit);
  }
  launch(candidates,target){
    const ai=this.ai,ready=candidates.filter(u=>readyForWave(u,ai.gameTime));
    for(const domain of new Set(ready.map(u=>u.domain))){
      const units=ready.filter(u=>u.domain===domain);
      if(!units.length)continue;
      let goal=target.clone();
      if(domain==='naval'){
        const enemy=ai.observedEnemies().find(e=>e.isUnit&&e.domain==='naval');
        if(enemy)goal=enemy.getPosition().clone();
      }
      const center=units.reduce((p,u)=>p.add(u.getPosition()),new THREE.Vector3()).multiplyScalar(1/units.length);
      const stage=center.clone().lerp(goal,.18);
      const assigned=this.order(units,stage,false);
      if(!assigned.length)continue;
      for(const unit of assigned)unit._aiMissionUntil=ai.gameTime+65;
      this.waves.push({units:assigned,target:goal,stage,launched:ai.gameTime,phase:'gather'});
    }
  }
  update(){
    const time=this.ai.gameTime;
    for(const wave of this.waves){
      wave.units=wave.units.filter(u=>u.alive&&!u.isRetreating&&(u._aiRetreatUntil??0)<=time);
      if(!wave.units.length)continue;
      if(wave.phase==='gather'){
        const assembled=wave.units.filter(u=>!u._pathPending&&u.getPosition().distanceTo(wave.stage)<18).length;
        if(assembled>=Math.ceil(wave.units.length*.7)||time-wave.launched>=8){
          this.order(wave.units,wave.target,true);wave.phase='advance';
        }
      }
    }
    this.waves=this.waves.filter(w=>w.units.length&&time-w.launched<65);
  }
}
