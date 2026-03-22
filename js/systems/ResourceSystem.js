import { GAME_CONFIG, BUILDING_STATS } from '../core/Constants.js';

export class ResourceSystem {
  constructor(game) {
    this.game = game;
    this.accumulator = 0;
    this.tickInterval = GAME_CONFIG.tickRate; // 1 second
  }

  update(delta) {
    this.accumulator += delta;

    if (this.accumulator >= this.tickInterval) {
      this.accumulator -= this.tickInterval;
      this.tick();
    }
  }

  tick() {
    const teams = ['player', 'enemy'];

    for (const team of teams) {
      // Base income
      let income = GAME_CONFIG.baseIncome;

      // Bonus income from resource depots
      const buildings = this.game.getBuildings(team);
      for (const building of buildings) {
        if (building.type === 'resourcedepot' && building.alive) {
          const depotIncome = BUILDING_STATS.resourcedepot.income || 8;
          income += depotIncome;
        }
      }

      // Apply income
      this.addIncome(team, income);
    }

    this.game.eventBus.emit('resource:changed', {
      player: this.game.teams.player.sp,
      enemy: this.game.teams.enemy.sp
    });
  }

  canAfford(team, cost) {
    return this.game.teams[team].sp >= cost;
  }

  spend(team, cost) {
    if (!this.canAfford(team, cost)) return false;
    this.game.teams[team].sp -= cost;

    this.game.eventBus.emit('resource:changed', {
      player: this.game.teams.player.sp,
      enemy: this.game.teams.enemy.sp
    });

    return true;
  }

  addIncome(team, amount) {
    this.game.teams[team].sp += amount;
  }

  getBalance(team) {
    return this.game.teams[team].sp;
  }

  // Calculate the income rate for a team (SP per second)
  getIncomeRate(team) {
    let income = GAME_CONFIG.baseIncome;
    const buildings = this.game.getBuildings(team);
    for (const building of buildings) {
      if (building.type === 'resourcedepot' && building.alive) {
        income += BUILDING_STATS.resourcedepot.income || 8;
      }
    }
    return income;
  }
}
