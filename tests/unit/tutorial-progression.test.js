import {Vector3} from 'three';
import {it, expect, vi, afterEach} from 'vitest';
import {TutorialSystem} from '../../js/systems/TutorialSystem.js';
import {EventBus} from '../../js/core/EventBus.js';
import {PRODUCTION_HOTKEYS} from '../../js/ui/ProductionShortcuts.js';
afterEach(() => vi.useRealTimers());
const unit = (team = 'player', type = 'infantry') => ({team, type, alive:true, isUnit:true});
function fixture(index = 0) {
 const game = {eventBus:new EventBus(), teams:{player:{sp:0}}};
 const tutorial = new TutorialSystem(game);
 tutorial._createOverlay = vi.fn(); tutorial._updateOverlay = vi.fn();
 tutorial._spawnTutorialEnemies = vi.fn(); tutorial._showCompletionScreen = vi.fn();
 tutorial.active = true; tutorial._setupStep(index);
 return {tutorial, bus:game.eventBus};
}
it('teaches current shared production shortcuts and waits for deployed units', () => {
 const {tutorial,bus} = fixture(5);
 expect(tutorial.steps[5].hint).toContain(`press ${PRODUCTION_HOTKEYS.infantry}`);
 expect(tutorial.steps[7].hint).toContain(`press ${PRODUCTION_HOTKEYS.tank}`);
 bus.emit('production:started',{unitType:'infantry',building:{team:'player'}});
 expect(tutorial._advanceRemaining).toBe(null);
 bus.emit('production:complete',{unitType:'infantry',building:{team:'enemy'}});
 expect(tutorial._advanceRemaining).toBe(null);
 bus.emit('production:complete',{unitType:'infantry',building:{team:'player'}});
 expect(tutorial._advanceRemaining).toBe(1);
 tutorial.dispose();
});
it.each([1,3])('ignores unrelated movement and requires a live player unit (step %s)',index => {
 const {tutorial,bus} = fixture(index); const event=tutorial.steps[index].event;
 for(const units of [[],[unit('enemy')],[{...unit(),alive:false}],[{team:'player',alive:true,isBuilding:true}]])bus.emit(event,{units});
 expect(tutorial._advanceRemaining).toBe(null);
 bus.emit(event,{units:[unit()]}); expect(tutorial._advanceRemaining).toBe(1);
 tutorial.dispose();
});
it('requires multiple living units rather than buildings for group selection', () => {
 const {tutorial,bus} = fixture(2);
 bus.emit('selection:changed',{entities:[unit(),{team:'player',alive:true,isBuilding:true}]});
 expect(tutorial._advanceRemaining).toBe(null);
 bus.emit('selection:changed',{entities:[unit(),unit()]}); expect(tutorial._advanceRemaining).toBe(1);
 tutorial.dispose();
});
it('requires the taught infantry grenade rather than any friendly ability', () => {
 const {tutorial,bus} = fixture(9);
 for(const data of [{unit:unit(),ability:'banzai'},{unit:unit('enemy'),ability:'grenade'},{unit:unit('player','tank'),ability:'grenade'}])bus.emit('ability:used',data);
 expect(tutorial._advanceRemaining).toBe(null);
 bus.emit('ability:used',{unit:unit(),ability:'grenade'}); expect(tutorial._advanceRemaining).toBe(1);
 tutorial.dispose();
});
it('advances once using simulation time and cancels pending progression on dispose', () => {
 vi.useFakeTimers(); const {tutorial,bus} = fixture(0);
 bus.emit('selection:changed',{entities:[unit()]});
 vi.advanceTimersByTime(5000); expect(tutorial.currentStep).toBe(0);
 tutorial.update(.5); expect(tutorial.currentStep).toBe(0);
 tutorial.update(.5); expect(tutorial.currentStep).toBe(1);
 bus.emit('command:move',{units:[unit()]}); tutorial.dispose(); tutorial.update(5);
 expect(tutorial.currentStep).toBe(1); expect(tutorial._listeners).toHaveLength(0);
});
it('restarting removes the previous step listener', () => {
 const {tutorial,bus} = fixture(1); tutorial.start();
 expect(bus.listeners['command:move']).toHaveLength(0);
 expect(bus.listeners['selection:changed']).toHaveLength(1);
 tutorial.dispose();
});

it('starts a fresh easy skirmish after teardown and ignores duplicate exit clicks', () => {
 const {tutorial} = fixture(); const order=[];
 tutorial.game.teams.enemy={nation:'germany'}; tutorial.game.teams.player.nation='france';
 tutorial.game.restart=vi.fn(()=>order.push('restart'));
 tutorial.game.uiManager={hideAll:vi.fn(()=>order.push('hide'))};
 tutorial.game.startGame=vi.fn(config=>{order.push('start'); return config;});
 const result=tutorial._exitTutorial(true);
 expect(order).toEqual(['restart','hide','start']);
 expect(result).toMatchObject({mode:'1P',gameMode:'hq_destruction',difficulty:'easy',mapTemplate:'plains',playerNation:'france',enemyNation:'germany'});
 expect(tutorial.active).toBe(false); expect(tutorial._listeners).toHaveLength(0);
 tutorial._exitTutorial(true); expect(tutorial.game.startGame).toHaveBeenCalledTimes(1);
});
it('returns to the menu through normal teardown without starting another match', () => {
 const {tutorial} = fixture(); tutorial.game.teams.enemy={};
 tutorial.game.restart=vi.fn(); tutorial.game.startGame=vi.fn();
 tutorial._exitTutorial(false);
 expect(tutorial.game.restart).toHaveBeenCalledTimes(1);
 expect(tutorial.game.startGame).not.toHaveBeenCalled();
});

function practice(origin = new Vector3(250, 0, 250)) {
 const soldier = {...unit(),domain:'land',getPosition:()=>origin};
 const game = {entities:[soldier],terrain:{isWalkable:()=>true},
   pathfinding:{findPathForDomain:vi.fn((start,end)=>[end.clone()])}};
 game.createUnit = vi.fn((type,team,pos)=>{
   const enemy={...unit(team,type),getPosition:()=>pos.clone()}; game.entities.push(enemy); return enemy;
 });
 return {tutorial:new TutorialSystem(game),game};
}
it('places practice enemies inside map bounds on reachable ground near actual infantry',()=>{
 const {tutorial,game}=practice(); tutorial._spawnTutorialEnemies();
 expect(game.createUnit).toHaveBeenCalledTimes(3);
 for(const [,team,pos] of game.createUnit.mock.calls){
  expect(team).toBe('enemy'); expect(pos.x).toBeGreaterThanOrEqual(2); expect(pos.x).toBeLessThan(254);
  expect(pos.z).toBeGreaterThanOrEqual(2); expect(pos.z).toBeLessThan(254);
 }
 expect(game.pathfinding.findPathForDomain.mock.calls.length).toBeLessThanOrEqual(4);
});
it('does not spawn on blocked terrain or across an unreachable route and bounds route probes',()=>{
 const {tutorial,game}=practice(new Vector3(100,0,100));
 game.terrain.isWalkable=()=>false; tutorial._spawnTutorialEnemies();
 expect(game.createUnit).not.toHaveBeenCalled();
 game.terrain.isWalkable=()=>true; game.pathfinding.findPathForDomain.mockReturnValue(null);
 tutorial._spawnTutorialEnemies(); expect(game.createUnit).not.toHaveBeenCalled();
 expect(game.pathfinding.findPathForDomain).toHaveBeenCalledTimes(4);
});
it('replenishes defeated practice targets without accumulating extra live enemies',()=>{
 const {tutorial,game}=practice(new Vector3(100,0,100));
 tutorial._ensurePracticeTargets(); tutorial._ensurePracticeTargets();
 expect(game.createUnit).toHaveBeenCalledTimes(3);
 tutorial._practiceTargets.forEach(enemy=>enemy.alive=false);
 tutorial._ensurePracticeTargets(); expect(game.createUnit).toHaveBeenCalledTimes(6);
 tutorial._ensurePracticeTargets(); expect(game.createUnit).toHaveBeenCalledTimes(6);
});
it('rejects a route redirected away from the requested practice tile',()=>{
 const {tutorial,game}=practice(new Vector3(100,0,100));
 game.pathfinding.findPathForDomain.mockReturnValue([new Vector3(1,0,1)]);
 tutorial._spawnTutorialEnemies(); expect(game.createUnit).not.toHaveBeenCalled();
});
it('checks target recovery on simulation time only during combat lessons',()=>{
 const {tutorial}=fixture(9); const ensure=vi.spyOn(tutorial,'_ensurePracticeTargets');
 tutorial.update(4); expect(ensure).not.toHaveBeenCalled();
 tutorial.update(1); expect(ensure).toHaveBeenCalledTimes(1);
 tutorial.currentStep=7; tutorial.update(10); expect(ensure).toHaveBeenCalledTimes(1);
 tutorial.dispose();
});
