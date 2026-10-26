import {Unit} from '../../js/entities/Unit.js';
import {Group} from 'three';
import {it,expect,vi} from 'vitest';
import {Vector3} from 'three';
import {Terrain} from '../../js/world/Terrain.js';
import {PathfindingSystem} from '../../js/systems/PathfindingSystem.js';
import {COMBAT_PLAYTESTS,deployCombatPlaytest,combatPlaytestResult} from '../../js/testing/CombatPlaytests.js';
import {UNIT_STATS} from '../../js/core/Constants.js';
import {CombatSystem} from '../../js/systems/CombatSystem.js';
it.each(Object.keys(COMBAT_PLAYTESTS))('deploys %s on real seeded terrain with domain-correct connected slots',key=>{
 const scenario=COMBAT_PLAYTESTS[key],terrain=new Terrain({},scenario.map,6819);
 const game={terrain,entities:[]};
 game.pathfinding=Object.assign(Object.create(PathfindingSystem.prototype),{game,gridSize:terrain.mapSize,worldScale:terrain.worldScale,_wallBlockedCells:new Set(),_wallCacheDirty:false});
 game.createUnit=(type,team,pos)=>{const stats=UNIT_STATS[type];const unit={type,team,domain:stats.domain,alive:true,health:stats.hp,maxHealth:stats.hp,getPosition:()=>pos.clone()};game.entities.push(unit);return unit;};
 try{
  const units=deployCombatPlaytest(game,key);
  expect(units.player.map(u=>u.type)).toEqual(scenario.player);
  expect(units.enemy.map(u=>u.type)).toEqual(scenario.enemy);
  for(const unit of [...units.player,...units.enemy]){
   const pos=unit.getPosition(),grid=terrain.worldToGrid(pos.x,pos.z);
   if(unit.domain!=='air')expect(game.pathfinding.isPassable(grid.x,grid.z,unit.domain)).toBe(true);
  }
  const positions=game.entities.map(u=>JSON.stringify(u.getPosition()));expect(new Set(positions).size).toBe(positions.length);
 }finally{terrain.dispose();}
});
it('scores retreat only after a real retreat command and two survivors recover near HQ',()=>{
 const unit=(x,hp)=>({alive:true,health:hp,maxHealth:100,getPosition:()=>new Vector3(x,0,0)});
 const deployed={player:[unit(10,70),unit(15,80),unit(80,90)],enemy:[unit(100,100)]};
 const context={elapsed:50,hq:{getPosition:()=>new Vector3()},retreatIssued:false};
 expect(combatPlaytestResult(COMBAT_PLAYTESTS.retreat,deployed,context).outcome).toBe('in-progress');
 expect(combatPlaytestResult(COMBAT_PLAYTESTS.retreat,deployed,{...context,retreatIssued:true}).outcome).toBe('success');
 deployed.player[1].health=40;expect(combatPlaytestResult(COMBAT_PLAYTESTS.retreat,deployed,{...context,retreatIssued:true,elapsed:180}).outcome).toBe('timeout');
});
it('reports destruction victory and player defeat separately',()=>{
 const deployed={player:[{alive:true}],enemy:[{alive:false}]};
 expect(combatPlaytestResult(COMBAT_PLAYTESTS.armor,deployed,{elapsed:10}).outcome).toBe('success');
 deployed.player[0].alive=false;expect(combatPlaytestResult(COMBAT_PLAYTESTS.armor,deployed,{elapsed:10}).outcome).toBe('defeat');
});
it.each(['player','enemy'])('applies fog auto-target restrictions to local team %s',team=>{
 const target={id:2,type:'tank',team:team==='player'?'enemy':'player',alive:true,domain:'land',health:100,getPosition:()=>new Vector3(5,0,0)};
 const unit={id:1,type:'tank',team,range:10,damage:25,getPosition:()=>new Vector3(),distanceTo:()=>5,attackEntity:vi.fn()};
 const game={eventBus:{on(){}},spatialGrid:{query:()=>[target]},fogOfWar:{team,isVisible:()=>false}};
 const combat=new CombatSystem(game);combat.autoAcquireTarget(unit);expect(unit.attackEntity).not.toHaveBeenCalled();
 game.fogOfWar.isVisible=()=>true;combat.autoAcquireTarget(unit);expect(unit.attackEntity).toHaveBeenCalledWith(target,true);
});

it('holds the recovery area after reaching a retreat destination instead of chasing again',()=>{
 const unit=new Unit('tank','player',new Vector3(20,0,20));unit.mesh=new Group();unit.mesh.position.set(20,0,20);
 unit.game={getUnits:()=>[],spatialGrid:{query:()=>[]}};
 unit.updateProceduralAnimation=()=>{};unit.updateStatusBadge=()=>{};
 unit.isRetreating=true;unit.retreatTarget=new Vector3(21,0,20);unit.moveTarget=new Vector3(21,0,20);
 unit.update(0);expect(unit.isRetreating).toBe(false);expect(unit._holdPosition).toBe(true);expect(unit.moveTarget).toBe(null);
 unit.chasePosition(new Vector3(100,0,20));expect(unit.moveTarget).toBe(null);
 unit.moveTo(new Vector3(30,0,20));expect(unit._holdPosition).toBe(false);expect(unit.moveTarget.x).toBe(30);
});
it('retreats across a real routed path instead of declaring arrival at its starting waypoint',async()=>{
 const terrain=new Terrain({},'plains',6819);
 const unit=new Unit('tank','player',new Vector3(76,0,112));unit.mesh=new Group();unit.mesh.position.set(76,2,112);
 const game={terrain,isMultiplayer:false,getUnits:()=>[]};
 game.pathfinding=Object.assign(Object.create(PathfindingSystem.prototype),{game,gridSize:terrain.mapSize,worldScale:terrain.worldScale,_wallBlockedCells:new Set(),_wallCacheDirty:false});
 unit.game=game;unit.updateProceduralAnimation=()=>{};unit.updateStatusBadge=()=>{};
 try{unit.startRetreat(new Vector3(48,2,121));await Promise.resolve();unit.update(1/30);
 expect(unit.isRetreating).toBe(true);expect(unit.retreatTarget.x).toBeLessThan(55);
 }finally{terrain.dispose();}
});
