import * as THREE from 'three';

/**
 * CommanderAbilitySystem - Handles execution of all commander abilities.
 * Extracted from Game.js to reduce file size and isolate ability logic.
 */
export class CommanderAbilitySystem {
  constructor(game) {
    this.game = game;
    this._pendingTimeouts = [];
    this._boundOnAbility = this._onAbility.bind(this);
    this.game.eventBus.on('commander:ability', this._boundOnAbility);
  }

  _onAbility(data) {
    const { unit, ability, targetPos } = data;
    if (!unit || !unit.alive) return;
    const team = unit.team;
    const otherTeam = team === 'player' ? 'enemy' : 'player';

    switch (ability.id) {
      case 'airborne_drop':
      case 'resistance_cell': {
        // Spawn infantry at target position
        const count = ability.spawnCount || 3;
        const pos = targetPos || unit.getPosition();
        for (let i = 0; i < count; i++) {
          const offset = new THREE.Vector3((this.game.rng.next() - 0.5) * 8, 0, (this.game.rng.next() - 0.5) * 8);
          this.game.createUnit('infantry', team, pos.clone().add(offset));
        }
        if (this.game.effectsManager) this.game.effectsManager.createSmoke(pos.clone());
        if (this.game.soundManager) this.game.soundManager.play('produce');
        break;
      }
      case 'rally_cry':
      case 'inspire':
      case 'blitzkrieg_cmd':
      case 'divine_wind':
      case 'banzai_wave':
      case 'iron_discipline': {
        // Timed aura buff applied to friendly units
        const aura = ability.aura;
        if (!aura) break;
        const duration = ability.duration || 10;
        const affected = this.game.entities.filter(e => e.isUnit && e.alive && e.team === team);
        for (const u of affected) {
          if (aura.domain && aura.domain !== 'infantry' && u.domain !== aura.domain) continue;
          if (aura.domain === 'infantry' && u.type !== 'infantry') continue;
          if (aura.damageMult) u._cmdAuraDmg = aura.damageMult;
          if (aura.speedMult) u._cmdAuraSpd = aura.speedMult;
          if (aura.armor) u.armor = (u.armor || 0) + aura.armor;
        }
        // Schedule removal
        this._pendingTimeouts.push(setTimeout(() => {
          for (const u of affected) {
            if (!u.alive) continue;
            if (aura.damageMult) delete u._cmdAuraDmg;
            if (aura.speedMult) delete u._cmdAuraSpd;
            if (aura.armor) u.armor = Math.max(0, (u.armor || 0) - aura.armor);
          }
        }, duration * 1000));
        if (this.game.soundManager) this.game.soundManager.play('ability');
        if (team === 'player' && this.game.uiManager?.hud) {
          this.game.uiManager.hud.showNotification(`${ability.name} activated!`, '#44ff88');
        }
        break;
      }
      case 'artillery_strike':
      case 'v2_strike':
      case 'naval_bombardment':
      case 'torpedo_barrage':
      case 'siege_bombardment_cmd': {
        // AOE damage at target
        const shells = ability.shells || 1;
        const dmg = ability.damage || 100;
        const radius = ability.radius || 10;
        const pos = targetPos || unit.getPosition();
        for (let s = 0; s < shells; s++) {
          const shellOffset = new THREE.Vector3((this.game.rng.next() - 0.5) * radius, 0, (this.game.rng.next() - 0.5) * radius);
          const shellPos = pos.clone().add(shellOffset);
          // Delayed impact for each shell
          this._pendingTimeouts.push(setTimeout(() => {
            if (this.game.state !== 'PLAYING') return;
            const enemies = this.game.getEntitiesByTeam(otherTeam);
            for (const enemy of enemies) {
              if (!enemy.alive) continue;
              const d = enemy.getPosition().distanceTo(shellPos);
              if (d <= radius) {
                const falloff = 1 - (d / radius) * 0.5;
                enemy.takeDamage(dmg * falloff);
                if (!enemy.alive && unit.addKill) {
                  unit.addKill();
                  this.game.eventBus.emit('combat:kill', { attacker: unit, defender: enemy });
                }
              }
            }
            if (this.game.effectsManager) this.game.effectsManager.createExplosion(shellPos);
            if (this.game.cameraController) this.game.cameraController.shake(1.5);
          }, s * 600));
        }
        if (this.game.soundManager) this.game.soundManager.play('explosion');
        break;
      }
      case 'smoke_barrage': {
        // Large smoke zone
        const pos = targetPos || unit.getPosition();
        const radius = ability.radius || 15;
        const duration = ability.duration || 8;
        this.game._smokeZones = this.game._smokeZones || [];
        this.game._smokeZones.push({ position: pos.clone(), radius, timer: duration });
        for (let i = 0; i < 6; i++) {
          const offset = new THREE.Vector3((this.game.rng.next() - 0.5) * radius, 0, (this.game.rng.next() - 0.5) * radius);
          if (this.game.effectsManager) this.game.effectsManager.createSmoke(pos.clone().add(offset));
        }
        if (this.game.soundManager) this.game.soundManager.play('ability');
        break;
      }
      case 'sabotage': {
        // Disable target building for duration
        const pos = targetPos || unit.getPosition();
        const range = ability.range || 30;
        const disableDur = ability.disableDuration || 15;
        const enemyBuildings = this.game.entities.filter(e => e.isBuilding && e.alive && e.team === otherTeam);
        let closest = null, closestDist = Infinity;
        for (const b of enemyBuildings) {
          const d = b.getPosition().distanceTo(pos);
          if (d < closestDist && d < range) { closest = b; closestDist = d; }
        }
        if (closest) {
          closest._sabotaged = true;
          const savedProduction = closest.currentProduction;
          closest.currentProduction = null;
          this._pendingTimeouts.push(setTimeout(() => {
            if (closest.alive) {
              closest._sabotaged = false;
              // Restore production if it was interrupted
              if (savedProduction && !closest.currentProduction) {
                closest.productionQueue.unshift(savedProduction);
              }
            }
          }, disableDur * 1000));
          if (this.game.effectsManager) this.game.effectsManager.createSmoke(closest.getPosition().clone());
        }
        break;
      }
      case 'fortify': {
        // Boost all friendly building HP
        const duration = ability.duration || 20;
        const mult = ability.hpMult || 1.5;
        const buildings = this.game.entities.filter(e => e.isBuilding && e.alive && e.team === team);
        for (const b of buildings) {
          b._origMaxHP = b.maxHealth;
          b.maxHealth = Math.floor(b.maxHealth * mult);
          b.health = Math.min(b.health + (b.maxHealth - b._origMaxHP), b.maxHealth);
        }
        this._pendingTimeouts.push(setTimeout(() => {
          for (const b of buildings) {
            if (b.alive && b._origMaxHP) {
              b.maxHealth = b._origMaxHP;
              b.health = Math.min(b.health, b.maxHealth);
              delete b._origMaxHP;
            }
          }
        }, duration * 1000));
        if (this.game.soundManager) this.game.soundManager.play('ability');
        break;
      }
      case 'panzer_ace': {
        // Commander self-buff: 2x damage
        const duration = ability.duration || 10;
        unit._cmdAuraDmg = ability.selfDamageMult || 2.0;
        this._pendingTimeouts.push(setTimeout(() => { if (unit.alive) delete unit._cmdAuraDmg; }, duration * 1000));
        if (this.game.soundManager) this.game.soundManager.play('ability');
        break;
      }
      case 'mountain_fortress': {
        // Spawn temporary turrets
        const pos = targetPos || unit.getPosition();
        const count = ability.turretCount || 3;
        const dur = ability.turretDuration || 30;
        for (let i = 0; i < count; i++) {
          const offset = new THREE.Vector3((this.game.rng.next() - 0.5) * 10, 0, (this.game.rng.next() - 0.5) * 10);
          const turret = this.game.createBuilding('turret', team, pos.clone().add(offset));
          if (turret) {
            this._pendingTimeouts.push(setTimeout(() => {
              if (turret.alive) {
                turret.health = 0;
                turret.alive = false;
                this.game.eventBus.emit('building:destroyed', { entity: turret });
              }
            }, dur * 1000));
          }
        }
        if (this.game.soundManager) this.game.soundManager.play('build');
        break;
      }
    }
  }

  dispose() {
    // Clear all pending timeouts
    for (const id of this._pendingTimeouts) {
      clearTimeout(id);
    }
    this._pendingTimeouts = [];
    // Unsubscribe from event
    this.game.eventBus.off('commander:ability', this._boundOnAbility);
  }
}
