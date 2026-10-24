import {it,expect,vi} from 'vitest';
import {Group,Vector3} from 'three';
import {SaveSystem} from '../../js/core/SaveSystem.js';
import {Unit} from '../../js/entities/Unit.js';
import {Building} from '../../js/entities/Building.js';
import {UNIT_STATS} from '../../js/core/Constants.js';
import {EventBus} from '../../js/core/EventBus.js';
import {resumeRestoredMovement} from '../../js/systems/SavedMovement.js';
function setup(){
 const research=()=>({completed:[],branches:{}});
 const game={mode:'1P',state:'PLAYING',gameElapsed:20,teams:{player:{nation:'america',sp:1000,mu:100},enemy:{nation:'germany',sp:1000,mu:100}},stats:{player:{},enemy:{}},research:{player:research(),enemy:research()},entities:[],eventBus:new EventBus(),removeEntity(entity){entity.alive=false;this.entities=this.entities.filter(e=>e!==entity);},createUnit(type,team,pos){const unit=new Unit(type,team,pos,UNIT_STATS[type]);unit.mesh=new Group();unit.mesh.position.copy(pos);unit.game=this;this.entities.push(unit);return unit;},createBuilding(type,team,pos){const b=new Building(type,team,pos);b.game=this;this.entities.push(b);return b;}};
 game.pathfinding={findPathAsync:vi.fn(async(_,goal)=>[goal.clone()])};
 const unit=game.createUnit('tank','player',new Vector3(10,0,10));return {game,unit,saves:new SaveSystem(game)};
}
it('round-trips retreat destination, formation pace and queued orders',async()=>{
 const {game,unit,saves}=setup();unit.isRetreating=true;unit.retreatTarget=new Vector3(30,0,30);unit.moveTarget=new Vector3(20,0,20);unit.waypoints=[new Vector3(30,0,30)];unit.formationSpeed=2;unit._queuedMoveOrders=[new Vector3(40,0,40)];const data=saves.serialize();await saves.deserialize(data);const loaded=game.entities[0];expect(loaded.isRetreating).toBe(true);expect(loaded.retreatTarget).toEqual(new Vector3(30,0,30));expect(loaded.formationSpeed).toBe(2);expect(loaded._queuedMoveOrders).toEqual([new Vector3(40,0,40)]);
});
it('reissues in-flight retreat paths without losing retreat state or duplicating queued destinations',async()=>{
 const {game,unit,saves}=setup();unit.isRetreating=true;unit.retreatTarget=new Vector3(30,0,30);unit._pathPending=true;unit._pendingMoveGoal=unit.retreatTarget.clone();unit._queuedMoveOrders=[new Vector3(40,0,40)];await saves.deserialize(saves.serialize());await Promise.resolve();const loaded=game.entities[0];expect(game.pathfinding.findPathAsync).toHaveBeenCalledOnce();expect(loaded.isRetreating).toBe(true);expect(loaded.moveTarget).toEqual(new Vector3(30,0,30));expect(loaded._queuedMoveOrders).toEqual([new Vector3(40,0,40)]);
});
it('waits for EMP recovery before resuming and lets a new stop override the saved order',async()=>{
 const {game,unit,saves}=setup();unit._pathPending=true;unit._pendingMoveGoal=new Vector3(30,0,30);unit.empDisabledTimer=3;await saves.deserialize(saves.serialize());const loaded=game.entities[0];expect(game.pathfinding.findPathAsync).not.toHaveBeenCalled();expect(loaded._restoredMoveGoal).toEqual(new Vector3(30,0,30));loaded.stop();loaded.empDisabledTimer=0;expect(resumeRestoredMovement(loaded,game)).toBe(false);expect(game.pathfinding.findPathAsync).not.toHaveBeenCalled();
});
it('recovers a legacy retreat goal from its route and clears impossible retreat flags',async()=>{
 const {game,unit,saves}=setup();unit.isRetreating=true;unit.moveTarget=new Vector3(20,0,20);const data=saves.serialize();delete data.entities[0].unit.retreatTarget;await saves.deserialize(data);expect(game.entities[0].retreatTarget).toEqual(new Vector3(20,0,20));data.entities[0].unit.moveTarget=null;await saves.deserialize(data);expect(game.entities[0].isRetreating).toBe(false);
});
it('preserves smoke/flare ownership and paid production receipts through actual deserialize',async()=>{
 const {game,saves}=setup();game._smokeZones=[{position:new Vector3(),radius:10,timer:4,team:'player'}];game._flareZones=[{position:new Vector3(10,0,10),radius:12,timer:6,team:'enemy'}];const b=game.createBuilding('barracks','player',new Vector3());b.queueUnit('infantry',{sp:25,mu:0});await saves.deserialize(saves.serialize());expect(game._smokeZones[0].team).toBe('player');expect(game._flareZones[0].team).toBe('enemy');expect(game.entities.find(e=>e.isBuilding)._productionReceipts).toEqual([{sp:25,mu:0}]);
});
it('resumes a deferred route after EMP recovery without dropping the following waypoint',async()=>{
 const {game,unit,saves}=setup();unit._pathPending=true;unit._pendingMoveGoal=new Vector3(30,0,30);unit._queuedMoveOrders=[new Vector3(40,0,40)];unit.empDisabledTimer=3;await saves.deserialize(saves.serialize());const loaded=game.entities[0];loaded.empDisabledTimer=0;expect(resumeRestoredMovement(loaded,game)).toBe(true);await Promise.resolve();expect(loaded.moveTarget).toEqual(new Vector3(30,0,30));expect(loaded._queuedMoveOrders).toEqual([new Vector3(40,0,40)]);
});
it('preserves patrol state while a pending route is regenerated',async()=>{
 const {game,unit,saves}=setup();unit._pathPending=true;unit._pendingMoveGoal=new Vector3(30,0,30);unit._isPatrolling=true;unit._patrolPoints=[new Vector3(10,0,10),new Vector3(30,0,30)];unit._patrolIndex=1;await saves.deserialize(saves.serialize());await Promise.resolve();const loaded=game.entities[0];expect(loaded._isPatrolling).toBe(true);expect(loaded._patrolIndex).toBe(1);expect(loaded._patrolPoints).toHaveLength(2);
});
it('clears retreat when a restored multiplayer route is genuinely unreachable',async()=>{
 const {game,unit,saves}=setup();game.isMultiplayer=true;game.getLocalTeam=()=> 'player';game.pathfinding.findPathForDomain=()=>[];unit.isRetreating=true;unit.retreatTarget=new Vector3(30,0,30);unit._pathPending=true;unit._pendingMoveGoal=unit.retreatTarget.clone();await saves.deserialize(saves.serialize());expect(game.entities[0].isRetreating).toBe(false);expect(game.entities[0].moveTarget).toBeNull();
});
