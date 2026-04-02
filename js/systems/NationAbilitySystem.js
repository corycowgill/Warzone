import { NATION_ABILITIES } from '../core/Constants.js';

export class NationAbilitySystem {
  constructor(game) {
    this.game = game;
    // Cooldown state per team
    this.state = {
      player: { cooldown: 0, activeEffect: null, activeTimer: 0 },
      enemy: { cooldown: 0, activeEffect: null, activeTimer: 0 }
    };
  }

  getAbility(team) {
    const nationKey = this.game.teams[team]?.nation;
    return nationKey ? NATION_ABILITIES[nationKey] : null;
  }

  canUse(team) {
    return this.state[team].cooldown <= 0 && !this.state[team].activeEffect;
  }

  getCooldownRemaining(team) {
    return Math.max(0, this.state[team].cooldown);
  }

  getActiveTimer(team) {
    return Math.max(0, this.state[team].activeTimer);
  }

  isActive(team) {
    return this.state[team].activeEffect !== null;
  }

  activate(team) {
    const ability = this.getAbility(team);
    if (!ability || !this.canUse(team)) return false;

    const st = this.state[team];
    st.cooldown = ability.cooldown;

    // Apply immediate effects
    switch (ability.id) {
      case 'lend_lease':
        this.game.teams[team].sp += ability.effect.grantSP;
        this.game.eventBus.emit('resource:changed', {
          player: this.game.teams.player.sp,
          enemy: this.game.teams.enemy.sp
        });
        if (team === 'player' && this.game.uiManager?.hud) {
          this.game.uiManager.hud.showNotification(`Lend-Lease: +${ability.effect.grantSP} SP!`, '#00ff88');
        }
        break;

      case 'naval_supremacy':
        st.activeEffect = 'naval_supremacy';
        st.activeTimer = ability.duration;
        this._applyNavalSupremacy(team, ability.effect);
        break;

      case 'resistance_network':
        st.activeEffect = 'resistance_network';
        st.activeTimer = ability.duration;
        // Fog of war reveal handled in update
        break;

      case 'banzai_charge':
        st.activeEffect = 'banzai_charge';
        st.activeTimer = ability.duration;
        this._applyBanzaiCharge(team, ability.effect);
        break;

      case 'blitzkrieg':
        st.activeEffect = 'blitzkrieg';
        st.activeTimer = ability.duration;
        this._applyBlitzkrieg(team, ability.effect);
        break;

      case 'war_economy':
        st.activeEffect = 'war_economy';
        st.activeTimer = ability.duration;
        // Cost reduction handled via getCostMultiplier()
        break;
    }

    if (this.game.soundManager) {
      this.game.soundManager.play('produce');
    }
    if (this.game.cameraController && team === 'player') {
      this.game.cameraController.shake(0.5);
    }

    this.game.eventBus.emit('nationAbility:activated', { team, ability });
    return true;
  }

  update(delta) {
    for (const team of ['player', 'enemy']) {
      const st = this.state[team];

      // Tick cooldown
      if (st.cooldown > 0) {
        st.cooldown -= delta;
      }

      // Tick active effect
      if (st.activeEffect) {
        st.activeTimer -= delta;
        if (st.activeTimer <= 0) {
          this._deactivateEffect(team, st.activeEffect);
          st.activeEffect = null;
          st.activeTimer = 0;
        }
      }

      // Resistance network: reveal all enemies
      if (st.activeEffect === 'resistance_network' && this.game.fogOfWar && team === 'player') {
        this.game.fogOfWar._resistanceReveal = true;
      }
    }

    // Clear resistance reveal when not active
    if (this.game.fogOfWar) {
      const playerSt = this.state.player;
      if (playerSt.activeEffect !== 'resistance_network') {
        this.game.fogOfWar._resistanceReveal = false;
      }
    }
  }

  // Get cost multiplier for War Economy
  getCostMultiplier(team) {
    const st = this.state[team];
    if (st.activeEffect === 'war_economy') {
      const ability = this.getAbility(team);
      return ability.effect.costReductionMult;
    }
    return 1.0;
  }

  _applyNavalSupremacy(team, effect) {
    const units = this.game.getUnits(team).filter(u => u.domain === 'naval');
    for (const unit of units) {
      unit._navalSupremacySpeed = unit.speed;
      unit._navalSupremacyDamage = unit.damage;
      unit.speed *= effect.navalSpeedMult;
      unit.damage *= effect.navalDamageMult;
    }
  }

  _applyBanzaiCharge(team, effect) {
    const units = this.game.getUnits(team).filter(u => u.type === 'infantry');
    for (const unit of units) {
      unit._banzaiSpeed = unit.speed;
      unit._banzaiDamage = unit.damage;
      unit._banzaiVulnerability = effect.infantryVulnerability;
      unit.speed *= effect.infantrySpeedMult;
      unit.damage *= effect.infantryDamageMult;
    }
  }

  _applyBlitzkrieg(team, effect) {
    const units = this.game.getUnits(team).filter(u => u.domain === 'land');
    for (const unit of units) {
      unit._blitzSpeed = unit.speed;
      unit.speed *= effect.landSpeedMult;
    }
  }

  _deactivateEffect(team, effectId) {
    switch (effectId) {
      case 'naval_supremacy': {
        const units = this.game.getUnits(team).filter(u => u.domain === 'naval');
        for (const unit of units) {
          if (unit._navalSupremacySpeed !== undefined) {
            unit.speed = unit._navalSupremacySpeed;
            unit.damage = unit._navalSupremacyDamage;
            delete unit._navalSupremacySpeed;
            delete unit._navalSupremacyDamage;
          }
        }
        break;
      }
      case 'banzai_charge': {
        const units = this.game.getUnits(team).filter(u => u.type === 'infantry');
        for (const unit of units) {
          if (unit._banzaiSpeed !== undefined) {
            unit.speed = unit._banzaiSpeed;
            unit.damage = unit._banzaiDamage;
            delete unit._banzaiSpeed;
            delete unit._banzaiDamage;
            delete unit._banzaiVulnerability;
          }
        }
        break;
      }
      case 'blitzkrieg': {
        const units = this.game.getUnits(team).filter(u => u.domain === 'land');
        for (const unit of units) {
          if (unit._blitzSpeed !== undefined) {
            unit.speed = unit._blitzSpeed;
            delete unit._blitzSpeed;
          }
        }
        break;
      }
      case 'resistance_network':
        if (this.game.fogOfWar) {
          this.game.fogOfWar._resistanceReveal = false;
        }
        break;
      case 'war_economy':
        // Passive - no cleanup needed
        break;
    }

    if (team === 'player' && this.game.uiManager?.hud) {
      this.game.uiManager.hud.showNotification('Ability effect expired', '#888888');
    }
  }
}
