import {Engineer} from '../../js/units/Engineer.js';
import {Scene} from 'three';
import {it,expect,vi,afterEach} from 'vitest';
import {Vector3} from 'three';
import {UNIT_ABILITIES} from '../../js/core/Constants.js';
import {CommandSystem} from '../../js/systems/CommandSystem.js';
import {BuildPanel} from '../../js/ui/BuildPanel.js';
import {CombatSystem} from '../../js/systems/CombatSystem.js';
import {LockstepManager} from '../../js/networking/LockstepManager.js';
const unit=(id,type='tank',team='player')=>({id,type,team,alive:true,isUnit:true,ability:UNIT_ABILITIES[type],canUseAbility:()=>true,getPosition:()=>new Vector3()});
afterEach(()=>vi.unstubAllGlobals());
function setup(units){
 vi.stubGlobal('document',{body:{style:{}}});
 const game={state:'PLAYING',mode:'1P',entities:units,selectionManager:{getSelected:()=>units},eventBus:{emit:vi.fn()},combatSystem:{executeAbility:vi.fn()}};
 game.commandSystem=new CommandSystem(game);return game;
}
it.each(['tank','spg','patrolboat','engineer'])('activates %s without requiring a target click',type=>{
 const units=[unit(1,type),unit(2,type),unit(3,'infantry')],game=setup(units);
 game.commandSystem.handleKeyPress({key:'g'});
 expect(game.commandSystem.abilityTargetMode).toBe(false);
 expect(game.combatSystem.executeAbility.mock.calls.map(([u])=>u.id)).toEqual([1,2]);
});
it('pins the intended owned group and does not cast another ability after selection changes',()=>{
 const drone=unit(1,'drone'),infantry=unit(2,'infantry'),game=setup([drone,infantry]);
 game.commandSystem.handleKeyPress({key:'g'});
 expect(game.commandSystem._abilityUnits).toEqual([drone]);
 game.selectionManager.getSelected=()=>[infantry];
 const target={id:9,alive:true,team:'enemy'};game.commandSystem.pickAbilityTarget=()=>target;
 const point=new Vector3(4,0,4);game.inputManager={getWorldPosition:()=>point};
 Object.assign(Object.create(BuildPanel.prototype),{game}).handleAbilityClick({clientX:1,clientY:1});
 expect(game.combatSystem.executeAbility).toHaveBeenCalledWith(drone,point,target);
 expect(game.commandSystem._abilityUnits).toBe(null);
});
it('retains entity targeting on an empty click without spending or casting',()=>{
 const game=setup([unit(1,'submarine')]);game.commandSystem.handleKeyPress({key:'g'});
 game.commandSystem.pickAbilityTarget=()=>null;game.inputManager={getWorldPosition:()=>new Vector3()};
 Object.assign(Object.create(BuildPanel.prototype),{game}).handleAbilityClick({});
 expect(game.commandSystem.abilityTargetMode).toBe(true);expect(game.combatSystem.executeAbility).not.toHaveBeenCalled();
});
it('queues self ability groups in multiplayer without local execution',()=>{
 const game=setup([unit(1),unit(2)]);game.isMultiplayer=true;game.getLocalTeam=()=> 'player';
 game.lockstepManager={enabled:true,queueCommand:vi.fn()};game.commandSystem.handleKeyPress({key:'g'});
 expect(game.lockstepManager.queueCommand).toHaveBeenCalledWith(LockstepManager.abilityCommand([1,2],0,null));
 expect(game.combatSystem.executeAbility).not.toHaveBeenCalled();
});
it('executes every regular unit in a lockstep ability command and resolves its target ID',()=>{
 const units=[unit(1,'drone'),unit(2,'drone')],target={id:9,alive:true,team:'enemy'};
 const game={entities:[...units,target],combatSystem:{executeAbility:vi.fn()}};
 Object.assign(Object.create(LockstepManager.prototype),{game})._executeCommand(LockstepManager.abilityCommand([1,2],0,new Vector3(),9),'player');
 expect(game.combatSystem.executeAbility).toHaveBeenCalledTimes(2);
 expect(game.combatSystem.executeAbility.mock.calls.every(args=>args[2]===target)).toBe(true);
});
it('rejects missing, friendly and out-of-range targets before charging MU',()=>{
 const game={eventBus:{on(){}},resourceSystem:{canAffordMU:()=>true,spendMU:vi.fn()}};
 const combat=new CombatSystem(game),drone=unit(1,'drone');combat.executeEMP=vi.fn(()=>true);
 expect(combat.executeAbility(drone,new Vector3(),null)).toBe(false);
 expect(combat.executeAbility(drone,null,{alive:true,team:'player',getPosition:()=>new Vector3()})).toBe(false);
 expect(combat.executeAbility(drone,null,{alive:true,team:'enemy',getPosition:()=>new Vector3(100,0,0)})).toBe(false);
 expect(game.resourceSystem.spendMU).not.toHaveBeenCalled();
 const target={alive:true,team:'enemy',getPosition:()=>new Vector3(4,0,0)};
 expect(combat.executeAbility(drone,null,target)).toBe(true);
 expect(game.resourceSystem.spendMU).toHaveBeenCalledTimes(1);expect(combat.executeEMP).toHaveBeenCalledWith(drone,target);
});

it('charges the advertised mine cost once through the real engineer implementation',()=>{
 let mu=50;const game={sceneManager:{scene:new Scene()},eventBus:{on(){},emit(){}},resourceSystem:{canAffordMU:(_,cost)=>mu>=cost,spendMU:vi.fn((_,cost)=>mu-=cost)}};
 const engineer=unit(1,'engineer');engineer.game=game;engineer.plantMine=Engineer.prototype.plantMine;
 const combat=new CombatSystem(game);
 try{expect(combat.executeAbility(engineer)).toBe(true);expect(mu).toBe(0);expect(game.resourceSystem.spendMU).toHaveBeenCalledTimes(1);expect(game._mines).toHaveLength(1);}
 finally{for(const mine of game._mines||[]){mine.mesh.geometry.dispose();mine.mesh.material.dispose();}}
});
it('normalizes serialized point targets for abilities that clone their position',()=>{
 const mortar=unit(1,'mortar');const game={entities:[mortar],combatSystem:{executeAbility:vi.fn()}};
 Object.assign(Object.create(LockstepManager.prototype),{game})._executeCommand(JSON.parse(JSON.stringify(LockstepManager.abilityCommand([1],0,new Vector3(4,0,5)))),'player');
 const point=game.combatSystem.executeAbility.mock.calls[0][1];expect(point.clone()).toEqual(new Vector3(4,0,5));
});
it('does not pick fog-hidden, friendly or stealthed ability targets',()=>{
 const game=setup([unit(1,'drone')]);
 game.sceneManager={renderer:{domElement:{getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})}},camera:{}};
 const mesh={visible:true,traverse(fn){fn(this);},isMesh:true};
 const target={...unit(9,'tank','enemy'),mesh};game.entities.push(target);
 const command=game.commandSystem;
 command.raycaster={setFromCamera(){},intersectObjects:meshes=>meshes.map(object=>({object}))};
 game.fogOfWar={team:'player',isVisible:()=>false};
 expect(command.pickAbilityTarget({clientX:50,clientY:50},'player')).toBe(null);
 game.fogOfWar.isVisible=()=>true;expect(command.pickAbilityTarget({clientX:50,clientY:50},'player')).toBe(target);
 target.isStealthed=()=>true;expect(command.pickAbilityTarget({clientX:50,clientY:50},'player')).toBe(null);
 target.isStealthed=()=>false;target.team='player';expect(command.pickAbilityTarget({clientX:50,clientY:50},'player')).toBe(null);
});
