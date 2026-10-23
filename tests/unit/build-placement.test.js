import {it,expect,vi,afterEach} from 'vitest';
import {BuildPanel} from '../../js/ui/BuildPanel.js';
afterEach(()=>vi.unstubAllGlobals());
function panel(result, multiplayer=false){
 vi.stubGlobal('document',{getElementById:()=>null});
 const build=Object.create(BuildPanel.prototype);
 Object.assign(build,{buildPlacementMode:true,buildPlacementType:'wall',cancelBuildPlacement:vi.fn(),hud:{formatName:x=>x,showNotification:vi.fn()},game:{isMultiplayer:multiplayer,getLocalTeam:()=> 'player',inputManager:{getWorldPosition:()=>({x:10,z:10})},productionSystem:{requestBuilding:vi.fn(()=>result),canRequestBuilding:vi.fn(()=>result)},lockstepManager:{enabled:multiplayer,queueCommand:vi.fn()}}});
 return build;
}
it('keeps failed placement active instead of forcing the player back through the menu',()=>{
 const build=panel(false);build.handleBuildPlacement({clientX:1,clientY:2});expect(build.cancelBuildPlacement).not.toHaveBeenCalled();expect(build.buildPlacementType).toBe('wall');
});
it('finishes a successful single placement but retains Shift placement',()=>{
 const build=panel(true);build.handleBuildPlacement({shiftKey:true});expect(build.cancelBuildPlacement).not.toHaveBeenCalled();build.handleBuildPlacement({shiftKey:false});expect(build.cancelBuildPlacement).toHaveBeenCalledOnce();
});
it('queues repeat construction through multiplayer lockstep without creating a building locally',()=>{
 const build=panel(true,true);build.handleBuildPlacement({shiftKey:true});expect(build.game.lockstepManager.queueCommand).toHaveBeenCalledOnce();expect(build.game.productionSystem.requestBuilding).not.toHaveBeenCalled();expect(build.cancelBuildPlacement).not.toHaveBeenCalled();
});
