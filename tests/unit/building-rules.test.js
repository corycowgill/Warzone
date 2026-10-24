import {it,expect,vi} from 'vitest';
import {Vector3} from 'three';
import {buildingCost,buildingEligibility} from '../../js/systems/BuildingRules.js';
import {ProductionSystem} from '../../js/systems/ProductionSystem.js';
import {BuildPanel} from '../../js/ui/BuildPanel.js';
function game(nation='austria',sp=180){
 const g={teams:{player:{nation,sp}},entities:[],getBuildings:()=>g.entities.filter(e=>e.alive),resourceSystem:{canAfford:(_,cost)=>g.teams.player.sp>=cost,spend:vi.fn((_,cost)=>g.teams.player.sp-=cost)},eventBus:{emit:vi.fn()},createBuilding:vi.fn(()=>({})),terrain:{isWalkable:()=>true}};
 return g;
}
it('makes discounted Austrian construction affordable at its actual charged price',()=>{
 const g=game();expect(buildingCost(g,'barracks','player')).toBe(180);expect(buildingEligibility(g,'barracks','player').allowed).toBe(true);
 g.teams.player.nation='america';expect(buildingCost(g,'barracks','player')).toBe(200);expect(buildingEligibility(g,'barracks','player').reason).toBe('cost');
});
it('displays the discounted price and disables the menu and preview when funds run out',()=>{
 const g=game(),price={},label={};
 const button={dataset:{buildType:'barracks'},style:{},querySelector:selector=>selector==='.build-cost'?price:label};
 const panel=Object.create(BuildPanel.prototype);Object.assign(panel,{game:g,buildPlacementType:'barracks',buildOptions:{querySelectorAll:()=>[button]}});
 panel.updateBuildMenuAvailability();expect(price.textContent).toBe('180 SP');expect(button.disabled).toBe(false);expect(panel.checkPlacementValid(new Vector3())).toBe(true);
 g.teams.player.sp=179;panel.updateBuildMenuAvailability();expect(button.disabled).toBe(true);expect(label.textContent).toContain('180');expect(panel.checkPlacementValid(new Vector3())).toBe(false);
});
it('keeps eligibility read-only and shares cost with actual placement and multiplayer validation',()=>{
 const g=game(),production=new ProductionSystem(g);production._startConstruction=vi.fn();const position=new Vector3(30,0,30);
 expect(production.canRequestBuilding('barracks','player',position)).toBe(true);expect(g.resourceSystem.spend).not.toHaveBeenCalled();expect(g.createBuilding).not.toHaveBeenCalled();
 expect(production.requestBuilding('barracks','player',position)).toBeTruthy();expect(g.resourceSystem.spend).toHaveBeenCalledWith('player',180);expect(g.teams.player.sp).toBe(0);
});
it('explains missing prerequisites, exhausted limits, unsuitable ground and building overlap',()=>{
 const g=game('america',10000),position=new Vector3();
 expect(buildingEligibility(g,'warfactory','player',position).reason).toBe('technology');
 g.entities=Array.from({length:3},()=>({type:'barracks',isBuilding:true,alive:true,getPosition:()=>new Vector3()}));
 expect(buildingEligibility(g,'barracks','player',position).reason).toBe('limit');
 g.entities=[];g.terrain.isWalkable=()=>false;expect(buildingEligibility(g,'wall','player',position).reason).toBe('terrain');
 g.terrain.isWalkable=()=>true;g.entities=[{type:'wall',isBuilding:true,alive:true,getPosition:()=>new Vector3()}];
 expect(buildingEligibility(g,'wall','player',position).reason).toBe('overlap');
});
it('revalidates resources between repeat placements without spending on failure',()=>{
 const g=game('america',50),production=new ProductionSystem(g);production._startConstruction=vi.fn();
 expect(production.requestBuilding('wall','player',new Vector3())).toBeTruthy();expect(production.requestBuilding('wall','player',new Vector3(50,0,50))).toBe(false);expect(g.resourceSystem.spend).toHaveBeenCalledOnce();
});
