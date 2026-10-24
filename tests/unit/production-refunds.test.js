import {it,expect,vi} from 'vitest';
import {Vector3} from 'three';
import {Building} from '../../js/entities/Building.js';
import {ProductionSystem} from '../../js/systems/ProductionSystem.js';
import {ResourceSystem} from '../../js/systems/ResourceSystem.js';
import {EventBus} from '../../js/core/EventBus.js';
import {productionPrice} from '../../js/systems/ProductionPricing.js';
import {SaveSystem} from '../../js/core/SaveSystem.js';
function setup(){
 const game={mode:'1P',entities:[],teams:{player:{nation:'france',sp:10000,mu:1000},enemy:{nation:'germany',sp:10000,mu:1000}},stats:{player:{resourcesGathered:0},enemy:{resourcesGathered:0}},eventBus:new EventBus(),getUnits:()=>[],getBuildings:()=>[],hasResearch:()=>false};
 game.resourceSystem=new ResourceSystem(game);const production=new ProductionSystem(game);production.hasTechRequirements=()=>true;
 const building=new Building('barracks','player',new Vector3());building.game=game;building._updateDamageState=()=>{};game.entities.push(building);
 return {game,production,building};
}
it('refunds the exact discounted payment after the temporary discount expires',()=>{
 const {game,production,building}=setup();let multiplier=.5;game.nationAbilitySystem={getCostMultiplier:()=>multiplier};const initial=game.teams.player.sp;
 expect(production.requestProduction(building,'infantry')).toBe(true);const paid=initial-game.teams.player.sp;expect(paid).toBeLessThan(productionPrice({...game,nationAbilitySystem:null},'player','infantry').sp);
 multiplier=1;expect(production.cancelProduction(building,0)).toBe(true);expect(game.teams.player.sp).toBe(initial);expect(building.productionQueue).toHaveLength(0);expect(game.stats.player.resourcesGathered).toBe(0);
});
it('cancels the first queued item before production starts and rejects invalid indices',()=>{
 const {production,building}=setup();production.requestProduction(building,'infantry');production.requestProduction(building,'engineer');expect(production.cancelProduction(building,0)).toBe(true);expect(building.productionQueue).toEqual(['engineer']);expect(building.cancelQueueItem(-1)).toBeNull();expect(building.cancelQueueItem(1.5)).toBeNull();expect(building._productionReceipts).toHaveLength(1);
});
it('keeps receipts aligned when active production is cancelled',()=>{
 const {game,production,building}=setup();production.requestProduction(building,'infantry');building.update(0);production.requestProduction(building,'engineer');const receipt=building._productionReceipts[1];production.cancelProduction(building,0);expect(building._productionReceipts[0]).toEqual(receipt);expect(building.productionQueue).toEqual(['engineer']);
 const save=Object.assign(Object.create(SaveSystem.prototype),{game});const stored=save._serializeEntities();expect(stored[0].building.productionReceipts).toEqual([receipt]);expect(stored[0].building.productionReceipts[0]).not.toBe(receipt);
});
it('preserves the selected multiplayer cancellation index without locally mutating the queue',()=>{
 const {game,production,building}=setup();production.requestProduction(building,'infantry');production.requestProduction(building,'engineer');game.isMultiplayer=true;game.lockstepManager={enabled:true,queueCommand:vi.fn()};production.cancelProduction(building,1);expect(game.lockstepManager.queueCommand).toHaveBeenCalledWith({type:'CANCEL_PRODUCE',entityIds:[building.id],data:{index:1}});expect(building.productionQueue).toHaveLength(2);
});
it('limits bulk orders by queue capacity and available funds',()=>{
 const {game,production,building}=setup();const cost=productionPrice(game,'player','infantry').sp;game.teams.player.sp=cost*2;
 expect(production.requestProductionBatch(building,'infantry',5)).toBe(2);expect(building.productionQueue).toHaveLength(2);expect(game.teams.player.sp).toBe(0);
 game.teams.player.sp=10000;expect(production.requestProductionBatch(building,'infantry',5)).toBe(3);expect(building.productionQueue).toHaveLength(5);
});
it('discards a completed payment receipt before refunding the next item',()=>{
 const {game,production,building}=setup();game.createUnit=()=>null;production.requestProduction(building,'infantry');building.update(0);production.requestProduction(building,'engineer');const receipt=building._productionReceipts[1];production.completeProduction(building);expect(building._productionReceipts).toEqual([receipt]);const before=game.teams.player.sp;production.cancelProduction(building,0);expect(game.teams.player.sp-before).toBe(receipt.sp);expect(building._productionReceipts).toHaveLength(0);
});
