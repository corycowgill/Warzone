import { it, expect, vi, afterEach } from 'vitest';
import { FogOfWar } from '../../js/systems/FogOfWar.js';
import { EventBus } from '../../js/core/EventBus.js';
import { Vector3 } from 'three';
afterEach(() => vi.unstubAllGlobals());
function fixture(worker = false) {
  vi.stubGlobal('Worker', class { postMessage = vi.fn(); terminate() {} });
  const enemy = { alive: true, team: 'enemy', attackCooldown: .2, _combatRevealTimer: 2, getPosition: () => new Vector3(20, 0, 20) };
  const game = { entities: [enemy], eventBus: new EventBus(), sceneManager: { scene: { add() {}, remove() {} } } };
  const fog = new FogOfWar(game, 'player');
  if (!worker) { fog._worker = null; }
  return { fog, enemy };
}
it.each([false, true])('expires shot reveals after two simulation seconds (worker=%s)', worker => {
  const { fog, enemy } = fixture(worker);
  for (let i = 0; i < 59; i++) fog.update(1 / 30);
  expect(enemy._combatRevealTimer).toBeGreaterThan(0);
  for (let i = 0; i < 2; i++) fog.update(1 / 30);
  expect(enemy._combatRevealTimer).toBe(0);
  // Reload cooldowns alone never refresh firing intel.
  fog.update(1 / 30);
  expect(enemy._combatRevealTimer).toBe(0);
  fog.dispose();
});
it('does not run a competing synchronous grid while a worker is pending', () => {
  const { fog } = fixture(true);
  const texture = vi.spyOn(fog, 'updateTexture');
  for (let i = 0; i < 12; i++) fog.update(1 / 30);
  expect(fog._worker.postMessage).toHaveBeenCalledTimes(1);
  expect(texture).not.toHaveBeenCalled();
  fog._worker.onmessage({ data: { type: 'fogResult', grid: fog.grid, textureData: fog._textureData } });
  for (let i = 0; i < 3; i++) fog.update(1 / 30);
  expect(fog._worker.postMessage).toHaveBeenCalledTimes(2);
  fog.dispose();
});
