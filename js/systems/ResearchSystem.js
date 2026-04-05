import { RESEARCH_UPGRADES, TECH_BRANCHES } from '../core/Constants.js';

export class ResearchSystem {
  constructor(game) {
    this.game = game;
    this.state = {
      player: { completed: [], inProgress: null, timer: 0, building: null, branches: {} },
      enemy: { completed: [], inProgress: null, timer: 0, building: null, branches: {} }
    };
  }

  startResearch(team, upgradeId) {
    const upgrade = RESEARCH_UPGRADES[upgradeId];
    if (!upgrade) return false;
    const state = this.state[team];
    if (!state) return false;
    if (state.completed.includes(upgradeId)) return false;
    if (state.inProgress) return false;
    if (this.game.teams[team].sp < upgrade.cost) return false;
    if (upgrade.muCost && this.game.teams[team].mu < upgrade.muCost) return false;

    // Check if the team has the required building
    const hasBuilding = this.game.getBuildings(team).some(b => b.type === upgrade.building);
    if (!hasBuilding) return false;

    this.game.teams[team].sp -= upgrade.cost;
    if (upgrade.muCost) this.game.teams[team].mu -= upgrade.muCost;
    state.inProgress = upgradeId;
    state.timer = upgrade.researchTime;

    // Find the building doing the research
    const building = this.game.getBuildings(team).find(b => b.type === upgrade.building);
    if (building) {
      state.building = building;
      building._researching = upgradeId;
    }

    return true;
  }

  update(delta) {
    for (const team of ['player', 'enemy']) {
      const state = this.state[team];
      if (!state.inProgress) continue;

      // Cancel research if building was destroyed — refund SP
      if (state.building && !state.building.alive) {
        let refundCost = 0;
        const upgrade = RESEARCH_UPGRADES[state.inProgress];
        if (upgrade) {
          refundCost = upgrade.cost;
        } else if (state._branchDomain) {
          // GD-090: Branch research refund
          const domainConfig = TECH_BRANCHES[state._branchDomain];
          const branch = domainConfig?.[state._branchKey];
          if (branch) refundCost = branch.cost;
          // Unlock the branch choice so they can re-choose
          delete state.branches[state._branchDomain];
          state._branchDomain = null;
          state._branchKey = null;
        }
        if (refundCost > 0) this.game.teams[team].sp += refundCost;
        state.inProgress = null;
        state.timer = 0;
        state.building = null;
        if (team === 'player' && this.game.uiManager && this.game.uiManager.hud) {
          this.game.uiManager.hud.showNotification(`Research cancelled: building destroyed! (${refundCost} SP refunded)`, '#ff4444');
        }
        continue;
      }

      state.timer -= delta;
      if (state.timer <= 0) {
        const upgradeId = state.inProgress;
        state.completed.push(upgradeId);
        state.inProgress = null;
        state.timer = 0;
        if (state.building) {
          state.building._researching = null;
          state.building = null;
        }

        // GD-090: Check if this is a branch research
        if (state._branchDomain) {
          this._completeBranchResearch(team, state._branchDomain, state._branchKey);
          state._branchDomain = null;
          state._branchKey = null;
        } else {
          // Apply upgrade effects to existing entities
          this.applyResearchUpgrade(team, upgradeId);

          if (team === 'player' && this.game.uiManager && this.game.uiManager.hud) {
            const upgrade = RESEARCH_UPGRADES[upgradeId];
            this.game.uiManager.hud.showNotification(`Research complete: ${upgrade.name}!`, '#00ffcc');
          }
          if (this.game.soundManager) this.game.soundManager.play('produce');
          this.game.eventBus.emit('research:complete', { team, upgradeId });
        }
      }
    }
  }

  applyResearchUpgrade(team, upgradeId) {
    const upgrade = RESEARCH_UPGRADES[upgradeId];
    if (!upgrade) return;
    const entities = this.game.getEntitiesByTeam(team);
    for (const entity of entities) {
      this.applyUpgradeToEntity(entity, upgrade);
    }
  }

  applyUpgradeToEntity(entity, upgrade) {
    if (upgrade.applies && !upgrade.applies(entity)) return;
    const fx = upgrade.effect;
    if (fx.armor) entity.armor = (entity.armor || 0) + fx.armor;
    if (fx.visionMult) entity.vision = (entity.vision || 10) * fx.visionMult;
    if (fx.rangeMult) entity.range = (entity.range || 6) * fx.rangeMult;
    if (fx.hpMult) {
      const ratio = entity.health / entity.maxHealth;
      entity.maxHealth *= fx.hpMult;
      entity.health = entity.maxHealth * ratio;
    }
    if (fx.attackRateMult) entity.attackRate = (entity.attackRate || 1) * fx.attackRateMult;
    if (fx.damageMult) entity.damage = (entity.damage || 1) * fx.damageMult;
    if (fx.speedMult) entity.speed = (entity.speed || 1) * fx.speedMult;
    if (fx.regen) entity._regenRate = (entity._regenRate || 0) + fx.regen;
  }

  applyAllResearchToEntity(entity) {
    const team = entity.team;
    if (!this.state[team]) return;
    for (const upgradeId of this.state[team].completed) {
      const upgrade = RESEARCH_UPGRADES[upgradeId];
      if (upgrade) this.applyUpgradeToEntity(entity, upgrade);
    }
    // GD-090: Apply branch doctrine effects
    const branches = this.state[team].branches;
    if (branches) {
      for (const domain of Object.keys(branches)) {
        const branchKey = branches[domain];
        const domainConfig = TECH_BRANCHES[domain];
        if (domainConfig && domainConfig[branchKey]) {
          this._applyBranchToEntity(entity, domainConfig[branchKey]);
        }
      }
    }
  }

  hasResearch(team, upgradeId) {
    return this.state[team]?.completed.includes(upgradeId) || false;
  }

  // GD-090: Branching Tech Tree
  startBranchResearch(team, domain, branchKey) {
    const domainConfig = TECH_BRANCHES[domain];
    if (!domainConfig) return false;

    const state = this.state[team];
    if (!state) return false;

    // Check if this domain already has a branch chosen
    if (state.branches[domain]) return false;

    // Need a tech lab
    const hasTechLab = this.game.getBuildings(team).some(b => b.type === 'techlab' && b.alive);
    if (!hasTechLab) return false;

    // Already researching something
    if (state.inProgress) return false;

    const branch = domainConfig[branchKey]; // 'branchA' or 'branchB'
    if (!branch) return false;

    // Check cost
    if (this.game.teams[team].sp < branch.cost) return false;
    if (branch.muCost && this.game.teams[team].mu < branch.muCost) return false;

    // Deduct cost
    this.game.teams[team].sp -= branch.cost;
    if (branch.muCost) this.game.teams[team].mu -= branch.muCost;

    // Lock the choice
    state.branches[domain] = branchKey;

    // Start research timer
    state.inProgress = `branch_${branch.id}`;
    state.timer = branch.researchTime;
    state._branchDomain = domain;
    state._branchKey = branchKey;

    const techLab = this.game.getBuildings(team).find(b => b.type === 'techlab' && b.alive);
    if (techLab) {
      state.building = techLab;
      techLab._researching = branch.name;
    }

    return true;
  }

  _completeBranchResearch(team, domain, branchKey) {
    const domainConfig = TECH_BRANCHES[domain];
    if (!domainConfig) return;
    const branch = domainConfig[branchKey];
    if (!branch) return;

    // Apply branch effects to all existing units
    const entities = this.game.getEntitiesByTeam(team);
    for (const entity of entities) {
      this._applyBranchToEntity(entity, branch);
    }

    if (team === 'player' && this.game.uiManager?.hud) {
      this.game.uiManager.hud.showNotification(`Doctrine complete: ${branch.name}!`, '#ff88ff');
    }
    if (this.game.soundManager) this.game.soundManager.play('produce');
    this.game.eventBus.emit('research:complete', { team, upgradeId: `branch_${branch.id}`, isBranch: true });
  }

  _applyBranchToEntity(entity, branch) {
    const fx = branch.effects;
    if (!fx) return;
    if (fx.applies && !fx.applies(entity)) return;
    if (fx.armor) entity.armor = (entity.armor || 0) + fx.armor;
    if (fx.damageMult) entity.damage = Math.round((entity.damage || 1) * fx.damageMult);
    if (fx.hpMult) {
      const ratio = entity.health / entity.maxHealth;
      entity.maxHealth = Math.round(entity.maxHealth * fx.hpMult);
      entity.health = Math.round(entity.maxHealth * ratio);
    }
    if (fx.speedMult) entity.speed = (entity.speed || 1) * fx.speedMult;
    if (fx.rangeMult) entity.range = (entity.range || 6) * fx.rangeMult;
    if (fx.regen) entity._regenRate = (entity._regenRate || 0) + fx.regen;
  }

  // Get the chosen branch for a domain/team (for applying to newly created units)
  getBranchChoice(team, domain) {
    return this.state[team]?.branches[domain] || null;
  }

  dispose() {
    this.state = {
      player: { completed: [], inProgress: null, timer: 0, building: null, branches: {} },
      enemy: { completed: [], inProgress: null, timer: 0, building: null, branches: {} }
    };
  }
}
