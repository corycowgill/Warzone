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
      // Base SP income
      let income = GAME_CONFIG.baseIncome;

      // Base MU income (from HQ)
      let muIncome = GAME_CONFIG.baseMUIncome;

      // Nation income bonus
      const nationKey = this.game.teams[team]?.nation;
      if (nationKey) {
        const nationData = NATIONS[nationKey];
        if (nationData && nationData.bonuses && nationData.bonuses.incomeBonus) {
          income += nationData.bonuses.incomeBonus;
        }
      }

      // Bonus income from resource/supply depots and munitions caches
      const buildings = this.game.getBuildings(team);
      for (const building of buildings) {
        // Skip buildings still under construction
        if (building._constructing) continue;
        const stats = BUILDING_STATS[building.type];
        if (stats && stats.income && building.alive) {
          income += stats.income;
        }
        // Munitions cache MU income
        if (stats && stats.muIncome && building.alive) {
          muIncome += stats.muIncome;
        }
        // Resource node proximity bonus (GD-060)
        if (this.game.getBuildingNodeBonus) {
          income += this.game.getBuildingNodeBonus(building);
        }
      }

      // AI difficulty resource bonus
      if (team === 'enemy' && this.game.aiDifficulty) {
        const diffConfig = AI_DIFFICULTY[this.game.aiDifficulty];
        if (diffConfig && diffConfig.resourceBonus > 0) {
          income = Math.floor(income * (1 + diffConfig.resourceBonus));
          muIncome = Math.floor(muIncome * (1 + diffConfig.resourceBonus));
        }
      }

      // Supply Lines research bonus (+25% income)
      if (this.game.hasResearch && this.game.hasResearch(team, 'supply_lines')) {
        income = Math.floor(income * 1.25);
        muIncome = Math.floor(muIncome * 1.25);
      }

      // GD-091: Neutral supply depot income bonus
      if (this.game.neutralStructures) {
        income += this.game.neutralStructures.getIncomeBonus(team);
      }

      // Apply income
      this.addIncome(team, income);
      this.addMUIncome(team, muIncome);
    }

    this.game.eventBus.emit('resource:changed', {
      player: this.game.teams.player.sp,
      enemy: this.game.teams.enemy.sp,
      playerMU: this.game.teams.player.mu,
      enemyMU: this.game.teams.enemy.mu
    });
  }

  canAfford(team, cost) {
    return this.game.teams[team].sp >= cost;
  }

  canAffordMU(team, muCost) {
    return (this.game.teams[team].mu || 0) >= muCost;
  }

  canAffordBoth(team, spCost, muCost) {
    return this.canAfford(team, spCost) && (!muCost || this.canAffordMU(team, muCost));
  }

  spend(team, cost) {
    if (!this.canAfford(team, cost)) return false;
    this.game.teams[team].sp -= cost;

    this.game.eventBus.emit('resource:changed', {
      player: this.game.teams.player.sp,
      enemy: this.game.teams.enemy.sp,
      playerMU: this.game.teams.player.mu,
      enemyMU: this.game.teams.enemy.mu
    });

    return true;
  }

  spendMU(team, muCost) {
    if (!this.canAffordMU(team, muCost)) return false;
    this.game.teams[team].mu -= muCost;

    this.game.eventBus.emit('resource:changed', {
      player: this.game.teams.player.sp,
      enemy: this.game.teams.enemy.sp,
      playerMU: this.game.teams.player.mu,
      enemyMU: this.game.teams.enemy.mu
    });

    return true;
  }

  spendBoth(team, spCost, muCost) {
    if (!this.canAffordBoth(team, spCost, muCost)) return false;
    this.game.teams[team].sp -= spCost;
    if (muCost) this.game.teams[team].mu -= muCost;

    this.game.eventBus.emit('resource:changed', {
      player: this.game.teams.player.sp,
      enemy: this.game.teams.enemy.sp,
      playerMU: this.game.teams.player.mu,
      enemyMU: this.game.teams.enemy.mu
    });

    return true;
  }

  addIncome(team, amount) {
    this.game.teams[team].sp += amount;
  }

  addMUIncome(team, amount) {
    if (!this.game.teams[team].mu) this.game.teams[team].mu = 0;
    this.game.teams[team].mu += amount;
  }

  getBalance(team) {
    return this.game.teams[team].sp;
  }

  getMUBalance(team) {
    return this.game.teams[team].mu || 0;
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
      if (building._constructing) continue;
      const stats = BUILDING_STATS[building.type];
      if (stats && stats.income && building.alive) {
        income += stats.income;
      }
      if (this.game.getBuildingNodeBonus) {
        income += this.game.getBuildingNodeBonus(building);
      }
    }

    // Supply Lines research bonus
    if (this.game.hasResearch && this.game.hasResearch(team, 'supply_lines')) {
      income = Math.floor(income * 1.25);
    }

    return income;
  }

  // Calculate the MU income rate for a team (MU per second)
  getMUIncomeRate(team) {
    let muIncome = GAME_CONFIG.baseMUIncome;

    const buildings = this.game.getBuildings(team);
    for (const building of buildings) {
      if (building._constructing) continue;
      const stats = BUILDING_STATS[building.type];
      if (stats && stats.muIncome && building.alive) {
        muIncome += stats.muIncome;
      }
    }

    // Supply Lines research bonus
    if (this.game.hasResearch && this.game.hasResearch(team, 'supply_lines')) {
      muIncome = Math.floor(muIncome * 1.25);
    }

    return muIncome;
  }
}
