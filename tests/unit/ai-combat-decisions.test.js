import {it,expect,vi} from 'vitest';
import {Vector3} from 'three';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {baseDefense,canEngage} from '../../js/ai/CombatDecisions.js';
import {readyForWave} from '../../js/ai/AttackWaves.js';
import {AIController} from '../../js/ai/AIController.js';
import {AIWorkerBridge} from '../../js/ai/AIWorkerBridge.js';
const unit=(id,x,type='infantry')=>({id,type,alive:true,isUnit:true,domain:'land',damage:10,speed:4,health:100,maxHealth:100,range:12,attackRate:1,getPosition:()=>new Vector3(x,0,20),distanceTo(other){return this.getPosition().distanceTo(other.getPosition());},attackEntity:vi.fn()});
function scenario(){
 const hq={alive:true,type:'headquarters',getPosition:()=>new Vector3(20,0,20)},threat=unit(100,35),units=Array.from({length:12},(_,i)=>unit(i,20+i));
 const ai={gameTime:100,team:'enemy',observedEnemies:()=>[threat],game:{getHQ:()=>hq,getBuildings:()=>[hq],getUnits:()=>units}};
 return {ai,threat,units};
}
it('sends a limited local response to a visible base raid',()=>{
 const {ai,units}=scenario(),response=baseDefense(ai);expect(response.units.length).toBeGreaterThan(0);expect(response.units.length).toBeLessThan(units.length);expect(response.position.x).toBe(35);
 ai.observedEnemies=()=>[];expect(baseDefense(ai)).toBeNull();
});
it('leaves wounded, recovering, disabled and distant forces alone',()=>{
 const {ai,units}=scenario();units.forEach(u=>u.health=20);units[0].health=100;units[0]._aiRecovering=true;units[1].health=100;units[1].empDisabledTimer=2;units[2].health=100;units[2].getPosition=()=>new Vector3(200,0,200);
 expect(baseDefense(ai)).toBeNull();
});
it('does not reinforce an already adequately defended raid',()=>{
 const {ai,units,threat}=scenario();units[0].attackTarget=threat;units[0].damage=100;
 expect(baseDefense(ai)).toBeNull();
});
it('protects defenders from worker attacks and repeated defense orders',()=>{
 const {ai}=scenario();Object.setPrototypeOf(ai,AIController.prototype);ai.attackWaves={order:vi.fn(list=>list)};
 ai.defendBase();const assigned=ai.attackWaves.order.mock.calls[0][0];expect(assigned.every(u=>!readyForWave(u,100))).toBe(true);
 ai.defendBase();expect(ai.attackWaves.order).toHaveBeenCalledOnce();
 ai.gameTime=103;ai.defendBase();expect(ai.attackWaves.order).toHaveBeenCalledOnce();
});
it('respects weapon domains, stealth and indirect-fire minimum range',()=>{
 const target=unit(1,10);expect(canEngage(unit(2,0,'aahalftrack'),target)).toBe(false);
 target.domain='air';expect(canEngage(unit(2,0,'scoutcar'),target)).toBe(false);
 target.isStealthed=()=>true;expect(canEngage(unit(2,0),target)).toBe(false);
 delete target.isStealthed;target.domain='land';expect(canEngage(unit(2,0,'mortar'),target,1)).toBe(false);
});
it('focuses a finishable visible target without switching to an invisible or overcommitted enemy',()=>{
 const u=unit(1,10),healthy=unit(2,20),weak=unit(3,21);weak.health=5;u.attackTarget=healthy;
 const ai=Object.assign(Object.create(AIController.prototype),{observedEnemies:()=>[healthy,weak],game:{combatSystem:{getCommittedDamage:()=>0}}});
 ai.checkFocusFire(u);expect(u.attackEntity).toHaveBeenCalledWith(weak,true);
 u.attackEntity.mockClear();ai.game.combatSystem.getCommittedDamage=e=>e===weak?100:0;ai.checkFocusFire(u);expect(u.attackEntity).not.toHaveBeenCalled();
 u.type='aahalftrack';ai.checkFocusFire(u);expect(u.attackTarget).toBeNull();
});
it('passes coordinated flanking from worker commands into the live wave planner',()=>{
 const u=unit(1,10);u.team='enemy';const launch=vi.fn(),bridge=Object.assign(Object.create(AIWorkerBridge.prototype),{team:'enemy',game:{entities:[u]},ai:{attackWaves:{launch}}});
 bridge._executeCommands([{cmd:'attack',unitIds:[1],targetX:100,targetZ:20,flank:true}]);expect(launch).toHaveBeenCalledWith([u],new Vector3(100,0,20),{flank:true});
});
it('the actual worker emits one coordinated attack and excludes unready units',()=>{
 const messages=[],context={self:{postMessage:m=>messages.push(m)}};vm.runInNewContext(readFileSync(new URL('../../js/workers/AIWorker.js',import.meta.url),'utf8'),context);
 const state={myUnits:Array.from({length:10},(_,i)=>({...unit(i,20),getPosition:undefined,readyForAttack:i<8})),myBuildings:[],enemyUnits:[],enemyBuildings:[{type:'headquarters',x:180,z:20}],sp:0,mu:0,gameTime:100,difficulty:'hard',strategy:'rush',gracePeriod:30,chosenBuildOrder:[],buildOrderIndex:0,config:{multiPronged:true},research:{completed:[]}};
 context.self.onmessage({data:{type:'aiDecide',team:'enemy',state}});const attacks=messages[0].commands.filter(c=>c.cmd==='attack');expect(attacks).toHaveLength(1);expect(attacks[0].unitIds).toHaveLength(8);expect(attacks[0].flank).toBe(true);expect(attacks[0].targetX).toBe(180);
});
