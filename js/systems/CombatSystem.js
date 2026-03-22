import * as THREE from 'three';
import { DAMAGE_MODIFIERS } from '../core/Constants.js';
import { Projectile } from '../entities/Projectile.js';

export class CombatSystem {
  constructor(game) {
    this.game = game;
  }

  update(delta) {
    const allUnits = this.game.entities.filter(e => e.isUnit && e.alive);
    const camera = this.game.sceneManager.camera;

    for (const unit of allUnits) {
      // Handle combat for units with attack targets
      if (unit.attackTarget) {
        if (!unit.attackTarget.alive) {
          unit.attackTarget = null;
          // Find new target nearby
          this.autoAcquireTarget(unit);
          continue;
        }

        // Check if in range and can fire
        if (unit.isInRange(unit.attackTarget) && unit.canAttack()) {
          this.performAttack(unit, unit.attackTarget);
        }
      } else {
        // Auto-acquire nearest enemy in range
        this.autoAcquireTarget(unit);
      }
    }

    // Update all entity health bars
    for (const entity of this.game.entities) {
      if (entity.alive) {
        entity.updateHealthBar(camera);
      }
    }
  }

  performAttack(attacker, defender) {
    if (!attacker.alive || !defender.alive) return;

    // Calculate damage with modifiers
    const baseDmg = attacker.damage;
    const defenderKey = defender.isBuilding ? 'building' : defender.type;
    const modifier = DAMAGE_MODIFIERS[attacker.type]?.[defenderKey] || 1.0;

    // Apply armor reduction (each armor point reduces damage by 2%)
    const armorReduction = defender.armor ? 1 - (defender.armor * 0.02) : 1.0;
    const finalDmg = Math.max(1, baseDmg * modifier * armorReduction);

    // Apply damage
    defender.takeDamage(finalDmg);

    // Reset attack cooldown on the attacker (this is the ONLY place it's set)
    attacker.attackCooldown = 1 / attacker.attackRate;

    // Face the target
    const attackerPos = attacker.getPosition();
    const defenderPos = defender.getPosition();
    const dx = defenderPos.x - attackerPos.x;
    const dz = defenderPos.z - attackerPos.z;
    if (attacker.mesh) {
      attacker.mesh.rotation.y = Math.atan2(dx, dz);
    }

    // Create projectile for visual effect
    const projectile = new Projectile(attacker, defender, 0, 80);
    this.game.addProjectile(projectile);

    // Create muzzle flash effect
    if (this.game.effectsManager) {
      this.game.effectsManager.createMuzzleFlash(attackerPos);
    }

    // Play attack sound
    if (this.game.soundManager) {
      this.game.soundManager.play('attack');
    }

    // Emit combat event
    this.game.eventBus.emit('combat:attack', {
      attacker,
      defender,
      damage: finalDmg
    });

    // Check if defender was killed
    if (!defender.alive) {
      this.game.eventBus.emit('combat:kill', {
        attacker,
        defender
      });
      // Clear attack target since defender is dead
      attacker.attackTarget = null;

      // Play death sound
      if (this.game.soundManager) {
        this.game.soundManager.play('death');
      }
    }
  }

  autoAcquireTarget(unit) {
    // Auto-acquire if idle or in attack-move mode
    if (unit.moveTarget && !unit._attackMove) return;

    const ownTeam = unit.team;
    const enemyTeam = ownTeam === 'player' ? 'enemy' : 'player';
    const autoRange = unit.range * 3; // Auto-acquire range in world units

    const enemies = this.game.getEntitiesByTeam(enemyTeam);
    let nearestEnemy = null;
    let nearestDist = Infinity;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;

      const dist = unit.distanceTo(enemy);
      if (dist <= autoRange && dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = enemy;
      }
    }

    if (nearestEnemy) {
      unit.attackEntity(nearestEnemy);
    }
  }
}
