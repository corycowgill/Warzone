import {it,expect,vi} from 'vitest';
import {PRODUCTION_HOTKEYS,productionShortcut} from '../../js/ui/ProductionShortcuts.js';
import {ProductionPanel} from '../../js/ui/ProductionPanel.js';
function setup(team='player'){
 const building={isBuilding:true,alive:true,team,produces:Object.keys(PRODUCTION_HOTKEYS)};
 const game={state:'PLAYING',mode:'1P',selectionManager:{getSelected:()=>[building]},productionSystem:{requestProductionBatch:vi.fn()}};
 return {building,game};
}
it('maps every advertised production key to exactly one unit and avoids camera/construction keys',()=>{
 const {game,building}=setup();const keys=Object.values(PRODUCTION_HOTKEYS);expect(new Set(keys).size).toBe(keys.length);
 for(const [type,key]of Object.entries(PRODUCTION_HOTKEYS))expect(productionShortcut(game,{key:key.toLowerCase()})).toEqual({building,type,count:1});
 for(const key of ['B','Q','E','W','S','T','R'])expect(keys).not.toContain(key);
 expect(PRODUCTION_HOTKEYS.spg).toBe('G');expect(PRODUCTION_HOTKEYS.bomber).toBe('Y');expect(PRODUCTION_HOTKEYS.engineer).toBe('V');
});
it('respects local multiplayer and hot-seat ownership and prioritizes units in mixed selections',()=>{
 const {game,building}=setup('enemy');game.isMultiplayer=true;game.getLocalTeam=()=> 'enemy';expect(productionShortcut(game,{key:'v',shiftKey:true})).toEqual({building,type:'engineer',count:5});
 game.isMultiplayer=false;game.mode='2P';game.activeTeam='enemy';expect(productionShortcut(game,{key:'g'}).type).toBe('spg');
 game.selectionManager.getSelected=()=>[building,{isUnit:true,alive:true,team:'enemy'}];expect(productionShortcut(game,{key:'g'})).toBeNull();
});
it('ignores typing, modifier shortcuts, repeat events, spectators and unfinished buildings',()=>{
 const {game,building}=setup();
 for(const flag of ['ctrlKey','metaKey','altKey','repeat','isComposing'])expect(productionShortcut(game,{key:'i',[flag]:true})).toBeNull();
 expect(productionShortcut(game,{key:'i',target:{closest:()=>({})}})).toBeNull();
 building._constructing=true;expect(productionShortcut(game,{key:'i'})).toBeNull();building._constructing=false;
 game.mode='SPECTATE';expect(productionShortcut(game,{key:'i'})).toBeNull();game.mode='1P';game.state='PAUSED';expect(productionShortcut(game,{key:'i'})).toBeNull();
});
it('does not train behind construction menus or placement mode and dispatches Shift batches once',()=>{
 const {game}=setup();const panel=Object.assign(Object.create(ProductionPanel.prototype),{game,hud:{buildPanel:{buildMenuOpen:true}}});const event={key:'i',shiftKey:true,preventDefault:vi.fn()};
 expect(panel.handleProductionHotkey(event)).toBe(false);panel.hud.buildPanel={buildPlacementMode:true};expect(panel.handleProductionHotkey(event)).toBe(false);panel.hud.buildPanel={};expect(panel.handleProductionHotkey(event)).toBe(true);expect(game.productionSystem.requestProductionBatch).toHaveBeenCalledOnce();expect(game.productionSystem.requestProductionBatch).toHaveBeenCalledWith(expect.anything(),'infantry',5);
});
