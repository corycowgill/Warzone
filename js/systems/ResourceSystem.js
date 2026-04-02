import { GAME_CONFIG, BUILDING_STATS, NATIONS, AI_DIFFICULTY } from '../core/Constants.js';

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

      // Nation income bonus
      const nationKey = this.game.teams[team]?.nation;
      if (nationKey) {
        const nationData = NATIONS[nationKey];
        if (nationData && nationData.bonuses && nationData.bonuses.incomeBonus) {
          income += nationData.bonuses.incomeBonus;
        }
      }

      // Bonus income from resource/supply depots
      const buildings = this.game.getBuildings(team);
      for (const building of buildings) {
        const stats = BUILDING_STATS[building.type];
        if (stats && stats.income && building.alive) {
          income += stats.income;
        }
      }

      // AI difficulty resource bonus
      if (team === 'enemy' && this.game.aiDifficulty) {
        const diffConfig = AI_DIFFICULTY[this.game.aiDifficulty];
        if (diffConfig && diffConfig.resourceBonus > 0) {
          income = Math.floor(income * (1 + diffConfig.resourceBonus));
        }
      }

      // Supply Lines research bonus (+25% income)
      if (this.game.hasResearch && this.game.hasResearch(team, 'supply_lines')) {
        income = Math.floor(income * 1.25);
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

    // Nation income bonus
    const nationKey = this.game.teams[team]?.nation;
    if (nationKey) {
      const nationData = NATIONS[nationKey];
      if (nationData && nationData.bonuses && nationData.bonuses.incomeBonus) {
        income += nationData.bonuses.incomeBonus;
      }
    }

    const buildings = this.game.getBuildings(team);
    for (const building of buildings) {
      const stats = BUILDING_STATS[building.type];
      if (stats && stats.income && building.alive) {
        income += stats.income;
      }
    }
    return income;
  }
}
