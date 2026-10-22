import {it,expect,vi} from 'vitest';
import {Vector3,PerspectiveCamera,Scene} from 'three';
import {EffectsManager} from '../../js/rendering/EffectsManager.js';
import {BattleFeedback,idleCombatUnit,damageEdge} from '../../js/ui/BattleFeedback.js';
import {EventBus} from '../../js/core/EventBus.js';
it('caps marker count and disposes the complete marker on expiry',()=>{
 const fx=Object.assign(Object.create(EffectsManager.prototype),{scene:new Scene(),game:{},activeEffects:[]});
 for(let i=0;i<9;i++)fx.createMoveMarker(new Vector3(),'blocked');
 expect(fx.activeEffects).toHaveLength(6);const marker=fx.activeEffects[0];
 const disposed=vi.spyOn(marker.group.children[0].geometry,'dispose');
 fx.update(1);expect(disposed).toHaveBeenCalledOnce();expect(fx.activeEffects).toHaveLength(0);expect(fx.scene.children).toHaveLength(0);
});
it('excludes held, retreating and actively assigned units from idle selection',()=>{
 const u={alive:true,damage:10};expect(idleCombatUnit(u)).toBe(true);
 for(const key of ['isGarrisoned','isRetreating','_aiRecovering','_pathPending','moveTarget','attackTarget','_holdPosition','empDisabledTimer'])expect(idleCombatUnit({...u,[key]:1})).toBe(false);
 expect(idleCombatUnit({...u,damage:0})).toBe(false);
});
it('filters local damage, expires cues, selects idle units and clears on HUD hide',()=>{
 const node=()=>({hidden:false,appendChild(){},textContent:''});
 vi.stubGlobal('document',{createElement:node});let now=1000;const clock=vi.spyOn(performance,'now').mockImplementation(()=>now);
 try{
  const camera=new PerspectiveCamera();camera.updateMatrixWorld();const bus=new EventBus();
  const mine={alive:true,damage:10,team:'enemy',getPosition:()=>new Vector3()},foe={...mine,team:'player',getPosition:()=>new Vector3(-20,0,-10)};
  const marker=vi.fn(),select=vi.fn(),hud={visible:true,hudEl:node(),game:{mode:'1P',isMultiplayer:true,getLocalTeam:()=>'enemy',getUnits:()=>[mine],sceneManager:{camera},eventBus:bus,effectsManager:{createMoveMarker:marker},selectionManager:{selectEntities:select}}};
  const feedback=new BattleFeedback(hud);feedback.update();feedback.idleButton.onclick();expect(select).toHaveBeenCalledWith([mine]);
  bus.emit('combat:attack',{attacker:foe,defender:mine,damage:20});expect(feedback.hits.get('left').el.hidden).toBe(false);
  now+=700;feedback.update();expect(feedback.hits.get('left').el.hidden).toBe(true);
  bus.emit('combat:attack',{attacker:mine,defender:foe,damage:20});expect([...feedback.hits.values()].every(h=>h.el.hidden)).toBe(true);
  bus.emit('command:blocked',{unit:mine,position:new Vector3()});bus.emit('command:blocked',{unit:mine,position:new Vector3()});expect(marker).toHaveBeenCalledTimes(1);
  feedback.clear();expect(feedback.blocked.hidden).toBe(true);expect(feedback.idleButton.hidden).toBe(true);
 }finally{clock.mockRestore();vi.unstubAllGlobals();}
});
it('projects incoming fire relative to the camera and handles rotation',()=>{
 const camera=new PerspectiveCamera(60,1,.1,1000);camera.updateMatrixWorld();
 expect(damageEdge(new Vector3(-10,0,-20),camera)).toBe('left');
 expect(damageEdge(new Vector3(10,0,-20),camera)).toBe('right');
 expect(damageEdge(new Vector3(0,10,-20),camera)).toBe('top');
 camera.rotation.z=Math.PI;camera.updateMatrixWorld();
 expect(damageEdge(new Vector3(10,0,-20),camera)).toBe('left');
});
