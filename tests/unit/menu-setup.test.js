import { describe, it, expect, vi, afterEach } from 'vitest';
import { UIManager } from '../../js/ui/UIManager.js';
import { NATIONS } from '../../js/core/Constants.js';

function setup(overrides = {}, seed = '') {
  const input = { value: seed, checkValidity: () => true, reportValidity: vi.fn(), focus: vi.fn() };
  vi.stubGlobal('document', { getElementById: () => input });
  const ui = {
    selectedPlayerNation: 'france', selectedEnemyNation: null,
    selectedMap: 'continental', selectedBiome: 'temperate',
    selectedDifficulty: 'normal', selectedGameMode: 'hq_destruction',
    game: { mode: '1P', startGame: vi.fn() }, showNotification: vi.fn(),
    ...overrides,
  };
  return { ui, input, launch: () => UIManager.prototype.handleStartGame.call(ui) };
}

afterEach(() => vi.unstubAllGlobals());

describe('battle setup launch', () => {
  it('preserves the chosen AI opponent and battlefield configuration', () => {
    const { ui, launch } = setup({ selectedEnemyNation: 'austria', selectedMap: 'islands',
      selectedBiome: 'arctic', selectedDifficulty: 'hard', selectedGameMode: 'domination' }, '12345');
    launch();
    expect(ui.game.startGame).toHaveBeenCalledWith({ mode: '1P', playerNation: 'france',
      enemyNation: 'austria', mapTemplate: 'islands', biome: 'arctic', difficulty: 'hard',
      gameMode: 'domination', mapSeed: 12345 });
  });

  it('resolves random opponent and map choices before launching', () => {
    const { ui, launch } = setup({ selectedMap: 'random' });
    launch();
    const config = ui.game.startGame.mock.calls[0][0];
    expect(NATIONS[config.enemyNation].side).toBe('enemy');
    expect(['continental', 'islands', 'river', 'plains']).toContain(config.mapTemplate);
    expect(config.mapSeed).toBeNull();
  });

  it('requires both nations for local two-player mode', () => {
    const game = { mode: '2P', startGame: vi.fn() };
    const { ui, launch } = setup({ game });
    launch();
    expect(game.startGame).not.toHaveBeenCalled();
    expect(ui.showNotification).toHaveBeenCalledWith('Player 2: Please select your nation');
    ui.selectedEnemyNation = 'japan';
    launch();
    expect(game.startGame).toHaveBeenCalledOnce();
  });

  it('keeps invalid map seeds in setup and focuses the error', () => {
    const { ui, input, launch } = setup({}, '-4');
    input.checkValidity = () => false;
    launch();
    expect(ui.game.startGame).not.toHaveBeenCalled();
    expect(input.reportValidity).toHaveBeenCalledOnce();
    expect(input.focus).toHaveBeenCalledOnce();
  });
});
