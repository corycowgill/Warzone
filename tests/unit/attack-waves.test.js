import {it,expect,vi} from 'vitest';
import {Vector3} from 'three';
import {AttackWaves,readyForWave} from '../../js/ai/AttackWaves.js';
import {AIController} from '../../js/ai/AIController.js';

function setup(){
 const units=Array.from({length:9},(_,id)=>({id,alive:true,damage:10,health:100,maxHealth:100,speed:4,domain:'land',type:'infantry',getPosition:()=>new Vector3(10,0,50)}));
 const ai={gameTime:100,game:{pathfinding:{findPathForDomain:(_a,b)=>[b]}},observedEnemies:()=>[],retreatUnit:vi.fn()};
 const waves=new AttackWaves(ai);waves.order=vi.fn(list=>list);return {units,ai,waves};
}
it('routes a smaller flank around the front then attacks the real objective',()=>{
 const {units,ai,waves}=setup(),target=new Vector3(150,0,50);
 waves.launch(units,target,{flank:true});expect(waves.waves).toHaveLength(2);
 const flank=waves.waves.find(w=>w.approach);expect(flank.units).toHaveLength(3);expect(flank.approach.z).not.toBe(50);
 ai.gameTime=109;waves.update();expect(flank.phase).toBe('flank');
 ai.gameTime=129;waves.update();expect(flank.phase).toBe('advance');expect(waves.order).toHaveBeenLastCalledWith(flank.units,target,true);
});
it('falls back to one attack when neither flank route is reachable',()=>{
 const {units,ai,waves}=setup();ai.game.pathfinding.findPathForDomain=()=>null;
 waves.launch(units,new Vector3(150,0,50),{flank:true});expect(waves.waves).toHaveLength(1);expect(waves.waves[0].approach).toBeUndefined();
});
it('withdraws a shattered wave without retasking other waves',()=>{
 const {units,ai,waves}=setup();waves.launch(units,new Vector3(150,0,50));
 units.slice(0,5).forEach(u=>u.alive=false);waves.update();expect(ai.retreatUnit).toHaveBeenCalledTimes(4);expect(waves.waves).toHaveLength(0);
});
it('holds recovering units until the cooldown and health threshold are satisfied',()=>{
 const {units}=setup(),u=units[0];u._aiRecovering=true;u._aiRetreatUntil=105;u.health=60;u.distanceTo=()=>0;
 const ai=Object.assign(Object.create(AIController.prototype),{gameTime:110,game:{getUnits:()=>[u],getHQ:()=>({})},assessAttackForce(){},retreatDamagedUnits(){},defendBase(){},considerNationAbility(){}});
 ai.executeMicro();expect(u.health).toBe(61);expect(readyForWave(u,110)).toBe(false);
 u.health=70;ai.executeMicro();expect(u._aiRecovering).toBe(false);expect(readyForWave(u,110)).toBe(true);
});
it('keeps artillery behind infantry with the same formation pace',()=>{
 const {units,ai}=setup();ai.game.pathfinding=null;
 units[0].type='mortar';units[0].speed=2;
 for(const u of units)u.moveTo=goal=>{u.goal=goal;};
 new AttackWaves(ai).order(units,new Vector3(100,0,50),true);
 expect(units[0].goal.x).toBeLessThan(Math.min(...units.slice(1).map(u=>u.goal.x)));
 expect(units.every(u=>u.formationSpeed===2&&u._attackMove)).toBe(true);
});
