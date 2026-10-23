import * as THREE from 'three';
import {planFormation} from '../systems/FormationPlanner.js';
import {issueUnitMove} from '../systems/MovementOrders.js';
export function readyForWave(unit,time){return unit.alive&&unit.damage>0&&!unit.isGarrisoned&&!unit.isRetreating&&!unit._aiRecovering&&!unit._pathPending&&!unit.attackTarget&&!unit.moveTarget&&unit.speed>0&&!(unit.empDisabledTimer>0)&&!unit._siegeMode&&unit.health/unit.maxHealth>.55&&(unit._aiRetreatUntil??0)<=time&&(unit._aiMissionUntil??0)<=time&&(unit._aiScoutUntil??0)<=time&&(unit._aiDefenseUntil??0)<=time;}
const support=u=>['mortar','spg'].includes(u.type);
export class AttackWaves {
  constructor(ai){this.ai=ai;this.waves=[];}
  order(units,target,attackMove){
    const ai=this.ai,offsets=units.map((_,i)=>({x:(i%4-1.5)*5,z:Math.floor(i/4)*5}));
    const center=units.reduce((p,u)=>p.add(u.getPosition()),new THREE.Vector3()).multiplyScalar(1/units.length);
    const heading=Math.atan2(target.x-center.x,target.z-center.z),speed=Math.min(...units.map(u=>u.speed));
    // Keep indirect fire behind the assault line, while retaining shared pacing.
    const front=units.filter(u=>!support(u)),rear=units.filter(support);
    const rearTarget=target.clone().add(new THREE.Vector3(-Math.sin(heading)*14,0,-Math.cos(heading)*14));
    const plans=[...planFormation(front,target,offsets.slice(0,front.length),heading,ai.game),...planFormation(rear,rearTarget,offsets.slice(0,rear.length),heading,ai.game)];
    for(const {unit,target:slot} of plans)issueUnitMove(unit,slot,ai.game,{attackMove,formationSpeed:speed});
    return plans.map(p=>p.unit);
  }
  launch(candidates,target,{flank=false}={}){
    const ai=this.ai,ready=candidates.filter(u=>readyForWave(u,ai.gameTime));
    if(flank){
      const land=ready.filter(u=>u.domain==='land'&&!support(u)).sort((a,b)=>b.speed-a.speed||a.id-b.id);
      if(land.length>=8){
        const flankers=land.slice(0,Math.floor(land.length/3));
        const center=land.reduce((p,u)=>p.add(u.getPosition()),new THREE.Vector3()).multiplyScalar(1/land.length);
        const direction=target.clone().sub(center).normalize();
        const midpoint=center.clone().lerp(target,.6);
        const choices=[1,-1].map(side=>midpoint.clone().add(new THREE.Vector3(-direction.z*side*32,0,direction.x*side*32)));
        // Probe two approaches with one representative; individual movement
        // orders still validate every route asynchronously in browser games.
        const waypoint=choices.find(p=>{
          const paths=ai.game.pathfinding;
          const leader=flankers[0];
          return paths?.findPathForDomain?.(leader.getPosition(),p,leader.domain)?.length&&paths.findPathForDomain(p,target,leader.domain)?.length;
        });
        if(waypoint){
          this.launch(ready.filter(u=>!flankers.includes(u)),target);
          this.launch(flankers,target);
          const wave=this.waves.at(-1);if(wave)wave.approach=waypoint;
          return;
        }
      }
    }
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
      this.waves.push({units:assigned,initialSize:assigned.length,target:goal,stage,launched:ai.gameTime,phase:'gather'});
    }
  }
  update(){
    const time=this.ai.gameTime;
    for(const wave of this.waves){
      wave.units=wave.units.filter(u=>u.alive&&!u.isRetreating&&(u._aiRetreatUntil??0)<=time&&(u._aiDefenseUntil??0)<=time);
      if(!wave.units.length)continue;
      if(wave.initialSize>=5&&wave.units.length<=wave.initialSize*.5){
        for(const unit of wave.units)this.ai.retreatUnit(unit);
        wave.units=[];continue;
      }
      if(wave.phase==='gather'){
        const assembled=wave.units.filter(u=>!u._pathPending&&u.getPosition().distanceTo(wave.stage)<18).length;
        if(assembled>=Math.ceil(wave.units.length*.7)||time-wave.launched>=8){
          this.order(wave.units,wave.approach??wave.target,true);wave.phase=wave.approach?'flank':'advance';
        }
      }
      if(wave.phase==='flank'){
        const arrived=wave.units.filter(u=>u.getPosition().distanceTo(wave.approach)<20).length;
        if(arrived>=Math.ceil(wave.units.length*.6)||time-wave.launched>=28){
          this.order(wave.units,wave.target,true);wave.phase='advance';
        }
      }
    }
    this.waves=this.waves.filter(w=>w.units.length&&time-w.launched<65);
  }
}
