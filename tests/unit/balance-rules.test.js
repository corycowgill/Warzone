import {describe,it,expect,vi} from 'vitest';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {SeededRandom} from '../../js/core/SeededRandom.js';
import {SaveSystem} from '../../js/core/SaveSystem.js';
import {ResourceSystem} from '../../js/systems/ResourceSystem.js';
import {ProductionSystem} from '../../js/systems/ProductionSystem.js';
import {incomeMultiplier,difficultyDamage} from '../../js/core/MatchRules.js';
import {AI_DIFFICULTY,GAME_CONFIG} from '../../js/core/Constants.js';
import {startingArmy} from '../../js/world/StartingDeployment.js';
import {buildingReserve} from '../../js/ai/AIBudget.js';
import {AIWorkerBridge} from '../../js/ai/AIWorkerBridge.js';
import {CombatSystem} from '../../js/systems/CombatSystem.js';
import {EventBus} from '../../js/core/EventBus.js';

describe('pacing and fair match rules',()=>{
 it('mirrors every starting combat unit around its HQ',()=>{
  const player=startingArmy('player'),enemy=startingArmy('enemy');
  expect(player.map(u=>u.type)).toEqual(enemy.map(u=>u.type));
  player.forEach((u,i)=>{expect(u.x-30).toBe(196-enemy[i].x);expect(u.z).toBe(enemy[i].z);});
 });
 it('keeps human difficulty advantages out of spectator, hot-seat and PvP matches',()=>{
  const game={mode:'1P',aiDifficulty:'kids',_difficultyConfig:AI_DIFFICULTY.kids};
  expect(incomeMultiplier(game,'player')).toBe(1);expect(incomeMultiplier(game,'enemy')).toBe(.5);
  expect(difficultyDamage(game,'player')).toBe(5);expect(difficultyDamage(game,'enemy')).toBe(.1);
  for(const mode of ['SPECTATE','2P']){game.mode=mode;expect(difficultyDamage(game,'player')).toBe(1);expect(difficultyDamage(game,'enemy')).toBe(1);expect(incomeMultiplier(game,'player')).toBe(incomeMultiplier(game,'enemy'));}
  game.mode='1P';game.isMultiplayer=true;expect(incomeMultiplier(game,'enemy')).toBe(1);expect(difficultyDamage(game,'player')).toBe(1);
 });
 it('uses equal hard-mode income for both AI exhibition teams',()=>{
  const game={mode:'SPECTATE',aiDifficulty:'hard'};expect(incomeMultiplier(game,'player')).toBe(1.5);expect(incomeMultiplier(game,'enemy')).toBe(1.5);
 });
 it('has progressively shorter opening delays on harder settings',()=>{
  expect(AI_DIFFICULTY.kids.openingDelay).toBeGreaterThan(AI_DIFFICULTY.easy.openingDelay);
  expect(AI_DIFFICULTY.easy.openingDelay).toBeGreaterThan(AI_DIFFICULTY.normal.openingDelay);
  expect(AI_DIFFICULTY.normal.openingDelay).toBeGreaterThan(AI_DIFFICULTY.hard.openingDelay);
  expect(GAME_CONFIG.unitSpeedMultiplier).toBe(4);
 });
 it('alternates team initiative deterministically on each combat tick',()=>{
  const order=[],units=['player','enemy'].map(team=>({team,type:'infantry',alive:true,isUnit:true,isInRange:()=>true,canAttack:()=>true,updateHealthBar(){}}));units[0].attackTarget=units[1];units[1].attackTarget=units[0];
  const game={eventBus:new EventBus(),sceneManager:{camera:{}},entities:units,getUnits:team=>units.filter(u=>u.team===team),getBuildings:()=>[]};
  const combat=new CombatSystem(game);combat.performAttack=u=>order.push(u.team);combat.update(.1);combat.update(.1);expect(order).toEqual(['player','enemy','enemy','player']);
 });
 it('advances repeatable worker build orders only after successful placement',()=>{
  const ai={buildOrderIndex:0,tryBuildBuilding:vi.fn(()=>false)},bridge=Object.assign(Object.create(AIWorkerBridge.prototype),{ai,game:{},team:'enemy'});
  const command={cmd:'build',buildingType:'resourcedepot',orderIndex:0};bridge._executeCommands([command]);expect(ai.buildOrderIndex).toBe(0);
  ai.tryBuildBuilding.mockReturnValue(true);bridge._executeCommands([command]);expect(ai.buildOrderIndex).toBe(1);bridge._executeCommands([command]);expect(ai.buildOrderIndex).toBe(1);
 });
 it('reserves a tech budget only after establishing an army, and releases it in combat',()=>{
  const units=Array.from({length:6},()=>({damage:8}));
  const ai={team:'enemy',buildOrderIndex:0,chosenBuildOrder:['warfactory'],game:{teams:{enemy:{nation:'germany'}},getUnits:()=>units,getBuildings:()=>[{type:'barracks'}]}};
  expect(buildingReserve(ai)).toBe(400);units[0].attackTarget={alive:true};expect(buildingReserve(ai)).toBe(0);delete units[0].attackTarget;units.pop();expect(buildingReserve(ai)).toBe(0);
 });
 it('tags worker depot orders and avoids overspending the reserved production budget',()=>{
  const messages=[],worker={self:{postMessage:m=>messages.push(m)}};vm.runInNewContext(readFileSync(new URL('../../js/workers/AIWorker.js',import.meta.url),'utf8'),worker);
  const state={myUnits:Array.from({length:6},(_,i)=>({id:i,type:'infantry',health:50,maxHealth:50})),myBuildings:[{id:1,type:'barracks',produces:['infantry'],canProduce:true}],enemyUnits:[],enemyBuildings:[],sp:170,mu:0,gameTime:20,difficulty:'normal',strategy:'balanced',gracePeriod:75,chosenBuildOrder:['resourcedepot','warfactory'],buildOrderIndex:0,config:{},buildReserveCost:150,unitCosts:{infantry:50,engineer:50,mortar:100},constructionCosts:{resourcedepot:150}};
  worker.self.onmessage({data:{type:'aiDecide',team:'enemy',state}});const commands=messages[0].commands;
  expect(commands.some(c=>c.cmd==='build'&&c.buildingType==='resourcedepot'&&c.orderIndex===0)).toBe(true);expect(commands.some(c=>c.cmd==='produce')).toBe(false);
 });
 it('reported hard-mode income matches actual spectator income ticks',()=>{
  const game={mode:'SPECTATE',aiDifficulty:'hard',teams:{player:{sp:0,mu:0},enemy:{sp:0,mu:0}},stats:{player:{},enemy:{}},eventBus:new EventBus(),getBuildings:()=>[]};
  const economy=new ResourceSystem(game);economy.tick();for(const team of ['player','enemy']){expect(game.teams[team].sp).toBe(economy.getIncomeRate(team));expect(game.teams[team].mu).toBe(economy.getMUIncomeRate(team));}
 });
 it('production spawn and rally positions use the simulation seed',()=>{
  const spawn=()=>{
   const game={rng:new SeededRandom(42),entities:[],eventBus:new EventBus(),createUnit:vi.fn(()=>({moveTo:vi.fn()}))};
   const building={currentProduction:'infantry',team:'player',getPosition:()=>new Vector3(),rallyPoint:new Vector3(10,0,10)};
   const random=vi.spyOn(Math,'random').mockImplementation(()=>{throw new Error('unseeded simulation randomness');});
   try{new ProductionSystem(game).completeProduction(building);}finally{random.mockRestore();}
   return {spawn:game.createUnit.mock.calls[0][2],rally:game.createUnit.mock.results[0].value.moveTo.mock.calls[0][0]};
  };
  expect(spawn()).toEqual(spawn());
 });
 it('save/load preserves combat initiative, simulation RNG and production spawn sequence',async()=>{
  const state=()=>({completed:[],inProgress:null,timer:0,branches:{}});
  const game={mode:'1P',gameElapsed:10,teams:{player:{nation:'america',sp:10,mu:0},enemy:{nation:'germany',sp:10,mu:0}},stats:{player:{},enemy:{}},entities:[],research:{player:state(),enemy:state()},combatSystem:{_combatTick:17},rng:new SeededRandom(42),eventBus:new EventBus(),removeEntity(){},createBuilding(type,team,pos){const b={type,team,alive:true,getPosition:()=>pos};this.entities.push(b);return b;}};
  game.rng.next();const expectedState=game.rng.state;
  game.entities.push({id:12,type:'barracks',team:'player',alive:true,isBuilding:true,health:400,maxHealth:400,getPosition:()=>new Vector3(),_spawnAngleIndex:7});
  const saves=new SaveSystem(game),data=saves.serialize();game.combatSystem._combatTick=0;game.rng.next();await saves.deserialize(data);
  expect(game.combatSystem._combatTick).toBe(17);expect(game.rng.state).toBe(expectedState);expect(game.entities[0]._spawnAngleIndex).toBe(7);
 });

});
