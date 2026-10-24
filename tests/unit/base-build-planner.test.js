import {it,expect,vi} from 'vitest';
import {Vector3} from 'three';
import {nextBaseBuildSite} from '../../js/ai/BaseBuildPlanner.js';
import {AIController} from '../../js/ai/AIController.js';
function setup(){
 const hq={id:1,type:'headquarters',alive:true,isBuilding:true,getPosition:()=>new Vector3(30,0,128)};
 const game={entities:[hq],teams:{player:{nation:'austria'}},terrain:{worldSize:256,isWalkable:()=>true},resourceSystem:{canAfford:(_,cost)=>cost<=180},getHQ:()=>hq,getBuildings:()=>game.entities,productionSystem:{requestBuilding:vi.fn(()=>({}))}};
 return {game,team:'player',nextBuildSlot:1};
}
it('searches past an overlapping first slot instead of retrying it forever',()=>{
 const ai=setup();ai.game.entities.push({id:2,type:'barracks',alive:true,isBuilding:true,getPosition:()=>new Vector3(30,0,146)});
 const site=nextBaseBuildSite(ai,'barracks');expect(site).not.toBeNull();expect(site.position.distanceTo(new Vector3(30,0,146))).toBeGreaterThan(10);expect(site.nextSlot).toBeGreaterThan(2);
});
it('uses the actual discounted construction cost and advances only after successful placement',()=>{
 const ai=setup();expect(AIController.prototype.tryBuildBuilding.call(ai,'barracks')).toBe(true);expect(ai.nextBuildSlot).toBe(2);
 ai.game.productionSystem.requestBuilding.mockReturnValue(false);const previous=ai.nextBuildSlot;expect(AIController.prototype.tryBuildBuilding.call(ai,'barracks')).toBe(false);expect(ai.nextBuildSlot).toBe(previous);
});
it('bounds terrain searches and returns a clean failure when no site is buildable',()=>{
 const ai=setup();ai.game.terrain.isWalkable=vi.fn(()=>false);expect(nextBaseBuildSite(ai,'barracks')).toBeNull();expect(ai.game.terrain.isWalkable.mock.calls.length).toBeLessThanOrEqual(36);
});
