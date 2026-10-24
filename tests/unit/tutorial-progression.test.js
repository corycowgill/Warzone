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
