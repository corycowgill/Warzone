import {it,expect,vi} from 'vitest';
import {Vector3} from 'three';
import {automaticTargetScore,retreatDestination} from '../../js/systems/CombatDecisions.js';
import {CombatSystem} from '../../js/systems/CombatSystem.js';
const entity=(id,x,type='barracks')=>({id,type,alive:true,getPosition:()=>new Vector3(x,0,50)});
it('favors dangerous armor over nearby low-threat infantry for automatic tank fire',()=>{
 const tank={id:1,type:'tank',damage:25,range:10};
 const infantry={id:2,type:'infantry',damage:8,attackRate:1,health:80};
 const threat={id:3,type:'heavytank',damage:50,attackRate:1,health:300,attackTarget:tank};
 expect(automaticTargetScore(tank,threat,15,300)).toBeGreaterThan(automaticTargetScore(tank,infantry,8,80));
});
it('never auto-acquires outside actual weapon range even if a spatial query includes it',()=>{
 const target={...entity(2,90,'tank'),team:'enemy',health:100,domain:'land'};
 const unit={...entity(1,50,'tank'),team:'player',range:5,damage:25,distanceTo:()=>40,attackEntity:vi.fn()};
 const combat=new CombatSystem({eventBus:{on(){}},spatialGrid:{query:()=>[target]}});combat.autoAcquireTarget(unit);expect(unit.attackEntity).not.toHaveBeenCalled();
});
it('keeps explicit movement and hold-fire orders free from automatic acquisition',()=>{
 const query=vi.fn(()=>[]),combat=new CombatSystem({eventBus:{on(){}},spatialGrid:{query}});
 combat.autoAcquireTarget({damage:25,moveTarget:new Vector3()});combat.autoAcquireTarget({damage:25,stance:'holdfire'});expect(query).not.toHaveBeenCalled();
});
function setup(){
 const unit={...entity(1,50,'tank'),team:'player',domain:'land'};
 const bases=[entity(10,65),entity(20,15)];
 const game={getBuildings:()=>bases,terrain:{worldSize:150,worldToGrid:(x,z)=>({x,z}),getHeightAt:()=>0},pathfinding:{isPassable:()=>true,findPathForDomain:vi.fn((_,target)=>[target.clone()])},spatialGrid:{query:x=>x>60?[{alive:true,team:'enemy',damage:60}]:[]}};
 return {unit,bases,game};
}
it('retreats to a less exposed base and rallies outside its building footprint',()=>{
 const {unit,bases,game}=setup();const target=retreatDestination(unit,game);expect(target.x).toBeLessThan(40);expect(target.distanceTo(bases[1].getPosition())).toBeGreaterThan(5);expect(game.pathfinding.findPathForDomain).toHaveBeenCalledOnce();
});
it('tries another base when the preferred retreat route is inaccessible',()=>{
 const {unit,game}=setup();game.pathfinding.findPathForDomain.mockImplementation((_,target)=>target.x<40?[]:[target.clone()]);const target=retreatDestination(unit,game);expect(target.x).toBeGreaterThan(40);expect(game.pathfinding.findPathForDomain).toHaveBeenCalledTimes(2);
});
it('reports no retreat destination instead of ordering a unit through blocked terrain',()=>{
 const {unit,game}=setup();game.pathfinding.isPassable=()=>false;expect(retreatDestination(unit,game)).toBeNull();expect(game.pathfinding.findPathForDomain).not.toHaveBeenCalled();
});
