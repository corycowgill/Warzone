import {it,expect,vi,afterEach} from 'vitest';
import {Vector3} from 'three';
import {visibleMinimapContact,canShowCombatPing,pushMinimapPing} from '../../js/world/MinimapPolicy.js';
import {Minimap} from '../../js/world/Minimap.js';
afterEach(()=>vi.unstubAllGlobals());
const contact=(team='player')=>({alive:true,team,isUnit:true,getPosition:()=>new Vector3(100,0,100)});
it('uses local multiplayer ownership for current and remembered contacts without revealing unseen enemies',()=>{
 const game={isMultiplayer:true,getLocalTeam:()=> 'enemy',fogOfWar:{team:'enemy',getStateAtGrid:()=>0}};
 expect(visibleMinimapContact(game,contact('enemy'))).toBe('visible');expect(visibleMinimapContact(game,contact('player'))).toBe('hidden');
 expect(visibleMinimapContact(game,{...contact(),_lastSeenPosition:new Vector3(30,0,30)})).toBe('remembered');expect(visibleMinimapContact(game,{...contact('enemy'),isGarrisoned:true})).toBe('hidden');
 game.fogOfWar.getStateAtGrid=()=>2;expect(visibleMinimapContact(game,contact())).toBe('visible');
});
it('filters hidden combat deaths but retains local losses and bounds ping memory',()=>{
 const game={mode:'1P',fogOfWar:{getStateAtGrid:()=>0}};
 expect(canShowCombatPing(game,{...contact('enemy'),alive:false})).toBeFalsy();expect(canShowCombatPing(game,{...contact('player'),alive:false})).toBe(true);
 const pings=[];for(let i=0;i<1000;i++)pushMinimapPing(pings,{x:i});expect(pings).toHaveLength(24);expect(pings[0].x).toBe(976);
});
it('does not reveal stealthed submarines or stale contacts in currently observed empty locations',()=>{
 const game={mode:'1P',fogOfWar:{getStateAtGrid:()=>2}};
 const sub={...contact('enemy'),type:'submarine',isStealthed:()=>true};expect(visibleMinimapContact(game,sub)).toBe('hidden');expect(canShowCombatPing(game,sub)).toBe(false);
 game.fogOfWar.getStateAtGrid=x=>x===15?2:0;expect(visibleMinimapContact(game,{...contact('enemy'),_lastSeenPosition:new Vector3(30,0,30)})).toBe('hidden');
});
function minimap(){
 const units=[{...contact(),id:1},{...contact('enemy'),id:2}],building={...contact(),id:3,isUnit:false,isBuilding:true,setRallyPoint:vi.fn()};
 const game={state:'PLAYING',mode:'1P',selectionManager:{getSelected:()=>[...units,building]},commandSystem:{moveUnits:vi.fn(),queueWaypoint:vi.fn(),attackMoveUnits:vi.fn()}};
 const map=Object.assign(Object.create(Minimap.prototype),{game,canvas:{getBoundingClientRect:()=>({left:0,top:0,width:200,height:200})},worldSize:256,_pings:[]});return {map,game,building};
}
it('sets building rally points and queues Shift movement for owned selections only',()=>{
 const {map,game,building}=minimap();map.handleRightClick({clientX:100,clientY:100,shiftKey:true});expect(game.commandSystem.queueWaypoint).toHaveBeenCalledWith([expect.objectContaining({id:1})],new Vector3(128,0,128));expect(building.setRallyPoint).toHaveBeenCalledWith(new Vector3(128,0,128));expect(game.commandSystem.moveUnits).not.toHaveBeenCalled();
});
it('sends attack-move and rally orders through lockstep instead of executing them locally',()=>{
 const {map,game,building}=minimap();game.isMultiplayer=true;game.getLocalTeam=()=> 'player';game.lockstepManager={enabled:true,queueCommand:vi.fn()};game.commandSystem.attackMoveMode=true;map.handleRightClick({clientX:100,clientY:100});expect(game.lockstepManager.queueCommand).toHaveBeenCalledTimes(2);expect(game.lockstepManager.queueCommand.mock.calls[0][0].entityIds).toEqual([1]);expect(game.commandSystem.attackMoveUnits).not.toHaveBeenCalled();expect(building.setRallyPoint).not.toHaveBeenCalled();expect(game.commandSystem.attackMoveMode).toBe(false);
});
it('finishes bounded tactical drawings after release outside the canvas and clears drawing mode on blur',()=>{
 const target=()=>({listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},removeEventListener(){}});
 const canvas=target(),window=target();vi.stubGlobal('window',window);canvas.getBoundingClientRect=()=>({left:0,top:0,width:200,height:200});
 const map=Object.assign(Object.create(Minimap.prototype),{canvas,worldSize:256,_listeners:[],game:{}});map.setupListeners();canvas.listeners.mousedown({ctrlKey:true,button:0,clientX:0,clientY:0});
 for(let i=0;i<400;i++)canvas.listeners.mousemove({clientX:i%200,clientY:10,buttons:1});expect(map._currentDrawing.length).toBeLessThanOrEqual(256);
 window.listeners.mouseup({});expect(map._drawingActive).toBe(false);expect(map._tacticalDrawings).toHaveLength(1);canvas.listeners.mousedown({ctrlKey:true,button:0,clientX:0,clientY:0});window.listeners.blur();expect(map._currentDrawing).toBeNull();map.dispose();
});
