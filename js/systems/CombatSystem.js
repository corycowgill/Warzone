import * as THREE from 'three';
import { DAMAGE_MODIFIERS, NATIONS, UNIT_ABILITIES } from '../core/Constants.js';
import { Projectile } from '../entities/Projectile.js';

export class CombatSystem {
  constructor(game) {
    this.game = game;
  }

  update(delta) {
    const allUnits = this.game.entities.filter(e => e.isUnit && e.alive);
    const camera = this.game.sceneManager.camera;

    for (const unit of allUnits) {
      // Skip garrisoned and EMP-disabled units
      if (unit.isGarrisoned) continue;
      if (unit.empDisabledTimer > 0) continue;

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

    // Handle turret attacks (buildings with isTurret flag)
    const turrets = this.game.entities.filter(e => e.isBuilding && e.isTurret && e.alive);
    for (const turret of turrets) {
      if (turret.attackTarget) {
        if (!turret.attackTarget.alive) {
          turret.attackTarget = null;
          continue;
        }
        if (turret.isInRange(turret.attackTarget) && turret.canAttack()) {
          this.performTurretAttack(turret, turret.attackTarget);
        }
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
      const offset = attacker.modelRotationOffset || 0;
      attacker.mesh.rotation.y = Math.atan2(dx, dz) + offset;
    }

    // Create projectile for visual effect
    const projectile = new Projectile(attacker, defender, 0, 80);
    this.game.addProjectile(projectile);

    // Create muzzle flash effect
    if (this.game.effectsManager) {
      this.game.effectsManager.createMuzzleFlash(attackerPos);
    }

    // Play attack sound (unit-type-specific)
    if (this.game.soundManager) {
      this.game.soundManager.play('attack', { unitType: attacker.type });
      this.game.soundManager.notifyCombat();
    }

    // Emit combat event
    this.game.eventBus.emit('combat:attack', {
      attacker,
      defender,
      damage: finalDmg
    });

    // Check if defender was killed
    if (!defender.alive) {
      // Award kill to attacker (veterancy)
      if (attacker.isUnit && attacker.addKill) {
        attacker.addKill();
      }

      this.game.eventBus.emit('combat:kill', {
        attacker,
        defender
      });
      // Clear attack target since defender is dead
      attacker.attackTarget = null;

      // Play death sound (unit-type-specific)
      if (this.game.soundManager) {
        this.game.soundManager.play('death', { unitType: defender.type });
      }
    }
  }

  performTurretAttack(turret, defender) {
    if (!turret.alive || !defender.alive) return;

    const baseDmg = turret.damage;
    const defenderKey = defender.isBuilding ? 'building' : defender.type;
    const modifier = DAMAGE_MODIFIERS[turret.type]?.[defenderKey] || 1.0;
    const armorReduction = defender.armor ? 1 - (defender.armor * 0.02) : 1.0;
    const finalDmg = Math.max(1, baseDmg * modifier * armorReduction);

    defender.takeDamage(finalDmg);
    turret.attackCooldown = 1 / turret.attackRate;

    // Projectile visual
    const projectile = new Projectile(turret, defender, 0, 100);
    this.game.addProjectile(projectile);

    if (this.game.effectsManager) {
      this.game.effectsManager.createMuzzleFlash(turret.getPosition());
    }

    if (this.game.soundManager) {
      this.game.soundManager.play('attack');
    }

    this.game.eventBus.emit('combat:attack', {
      attacker: turret,
      defender,
      damage: finalDmg
    });

    if (!defender.alive) {
      this.game.eventBus.emit('combat:kill', {
        attacker: turret,
        defender
      });
      turret.attackTarget = null;
      if (this.game.soundManager) {
        this.game.soundManager.play('death');
      }
    }
  }

  // --- Ability Execution ---

  executeAbility(unit, targetPos, targetEntity) {
    if (!unit.ability || !unit.canUseAbility()) return false;
    const abilityDef = UNIT_ABILITIES[unit.type];
    if (!abilityDef) return false;

    switch (abilityDef.id) {
      case 'grenade': return this.executeGrenade(unit, targetPos);
      case 'siege_mode': return this.executeSiegeMode(unit);
      case 'emp': return this.executeEMP(unit, targetEntity);
      case 'bombing_run': return this.executeBombingRun(unit, targetPos);
      case 'barrage': return this.executeBarrage(unit, targetPos);
      case 'launch_squadron': return this.executeLaunchSquadron(unit, targetPos);
      case 'torpedo_salvo': return this.executeTorpedoSalvo(unit, targetEntity);
      default: return false;
    }
  }

  executeGrenade(unit, targetPos) {
    const ab = UNIT_ABILITIES.infantry;
    const unitPos = unit.getPosition();
    if (unitPos.distanceTo(targetPos) > ab.range * 3) return false;
    unit.abilityCooldown = ab.cooldown;
    const enemies = this.game.getEntitiesByTeam(unit.team === 'player' ? 'enemy' : 'player');
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const d = enemy.getPosition().distanceTo(targetPos);
      if (d <= ab.radius) {
        enemy.takeDamage(ab.damage * (1 - (d / ab.radius) * 0.5));
        if (!enemy.alive && unit.addKill) {
          unit.addKill();
          this.game.eventBus.emit('combat:kill', { attacker: unit, defender: enemy });
        }
      }
    }
    if (this.game.effectsManager) this.game.effectsManager.createExplosion(targetPos);
    if (this.game.soundManager) this.game.soundManager.play('explosion');
    this.game.eventBus.emit('ability:used', { unit, ability: 'grenade', target: targetPos });
    return true;
  }

  executeSiegeMode(unit) {
    unit.toggleSiegeMode();
    if (this.game.soundManager) this.game.soundManager.play('build');
    this.game.eventBus.emit('ability:used', { unit, ability: 'siege_mode', active: unit._siegeMode });
    return true;
  }

  executeEMP(unit, targetEntity) {
    if (!targetEntity || !targetEntity.alive) return false;
    const ab = UNIT_ABILITIES.drone;
    if (unit.distanceTo(targetEntity) > ab.range * 3) return false;
    unit.abilityCooldown = ab.cooldown;
    if (targetEntity.isUnit && targetEntity.empDisabledTimer !== undefined) {
      targetEntity.empDisabledTimer = ab.disableDuration;
      targetEntity.attackTarget = null;
      targetEntity.moveTarget = null;
      targetEntity.isMoving = false;
    }
    targetEntity.takeDamage(ab.damage);
    if (!targetEntity.alive && unit.addKill) {
      unit.addKill();
      this.game.eventBus.emit('combat:kill', { attacker: unit, defender: targetEntity });
    }
    if (this.game.effectsManager) this.game.effectsManager.createMuzzleFlash(targetEntity.getPosition());
    if (this.game.soundManager) this.game.soundManager.play('attack');
    this.game.eventBus.emit('ability:used', { unit, ability: 'emp', target: targetEntity });
    return true;
  }

  executeBombingRun(unit, targetPos) {
    const ab = UNIT_ABILITIES.plane;
    const unitPos = unit.getPosition();
    if (unitPos.distanceTo(targetPos) > ab.range * 3) return false;
    unit.abilityCooldown = ab.cooldown;
    const enemies = this.game.getEntitiesByTeam(unit.team === 'player' ? 'enemy' : 'player');
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const d = enemy.getPosition().distanceTo(targetPos);
      if (d <= ab.radius) {
        enemy.takeDamage(ab.damage * (1 - (d / ab.radius) * 0.3));
        if (!enemy.alive && unit.addKill) {
          unit.addKill();
          this.game.eventBus.emit('combat:kill', { attacker: unit, defender: enemy });
        }
      }
    }
    if (this.game.effectsManager) {
      const dir = targetPos.clone().sub(unitPos).normalize();
      for (let i = -1; i <= 1; i++) {
        this.game.effectsManager.createExplosion(targetPos.clone().add(dir.clone().multiplyScalar(i * 3)));
      }
    }
    if (this.game.soundManager) this.game.soundManager.play('explosion');
    this.game.eventBus.emit('ability:used', { unit, ability: 'bombing_run', target: targetPos });
    return true;
  }

  executeBarrage(unit, targetPos) {
    const ab = UNIT_ABILITIES.battleship;
    if (unit.getPosition().distanceTo(targetPos) > ab.range * 3) return false;
    unit.abilityCooldown = ab.cooldown;
    const enemyTeam = unit.team === 'player' ? 'enemy' : 'player';
    for (let salvo = 0; salvo < ab.salvos; salvo++) {
      setTimeout(() => {
        if (!unit.alive) return;
        const offset = new THREE.Vector3((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4);
        const impactPos = targetPos.clone().add(offset);
        for (const enemy of this.game.getEntitiesByTeam(enemyTeam)) {
          if (!enemy.alive) continue;
          const d = enemy.getPosition().distanceTo(impactPos);
          if (d <= ab.radius) {
            enemy.takeDamage(ab.damage * (1 - (d / ab.radius) * 0.5));
            if (!enemy.alive && unit.addKill) {
              unit.addKill();
              this.game.eventBus.emit('combat:kill', { attacker: unit, defender: enemy });
            }
          }
        }
        if (this.game.effectsManager) this.game.effectsManager.createExplosion(impactPos);
        if (this.game.soundManager) this.game.soundManager.play('explosion');
      }, salvo * 800);
    }
    this.game.eventBus.emit('ability:used', { unit, ability: 'barrage', target: targetPos });
    return true;
  }

  executeLaunchSquadron(unit, targetPos) {
    const ab = UNIT_ABILITIES.carrier;
    if (unit.getPosition().distanceTo(targetPos) > ab.range * 3) return false;
    unit.abilityCooldown = ab.cooldown;
    const enemyTeam = unit.team === 'player' ? 'enemy' : 'player';
    const interval = ab.squadronDuration / ab.squadronCount;
    for (let i = 0; i < ab.squadronCount; i++) {
      setTimeout(() => {
        if (!unit.alive) return;
        let nearest = null, nd = Infinity;
        for (const enemy of this.game.getEntitiesByTeam(enemyTeam)) {
          if (!enemy.alive) continue;
          const d = enemy.getPosition().distanceTo(targetPos);
          if (d < nd && d < 15) { nd = d; nearest = enemy; }
        }
        if (nearest) {
          nearest.takeDamage(ab.squadronDamage);
          if (!nearest.alive && unit.addKill) {
            unit.addKill();
            this.game.eventBus.emit('combat:kill', { attacker: unit, defender: nearest });
          }
          if (this.game.effectsManager) this.game.effectsManager.createMuzzleFlash(nearest.getPosition());
        }
        if (this.game.soundManager) this.game.soundManager.play('attack');
      }, i * interval * 1000);
    }
    this.game.eventBus.emit('ability:used', { unit, ability: 'launch_squadron', target: targetPos });
    return true;
  }

  executeTorpedoSalvo(unit, targetEntity) {
    if (!targetEntity || !targetEntity.alive) return false;
    const ab = UNIT_ABILITIES.submarine;
    if (unit.distanceTo(targetEntity) > ab.range * 3) return false;
    unit.abilityCooldown = ab.cooldown;
    targetEntity.takeDamage(ab.damage);
    if (!targetEntity.alive && unit.addKill) {
      unit.addKill();
      this.game.eventBus.emit('combat:kill', { attacker: unit, defender: targetEntity });
    }
    const projectile = new Projectile(unit, targetEntity, 0, 50);
    this.game.addProjectile(projectile);
    if (this.game.effectsManager) this.game.effectsManager.createExplosion(targetEntity.getPosition());
    if (this.game.soundManager) this.game.soundManager.play('explosion');
    this.game.eventBus.emit('ability:used', { unit, ability: 'torpedo_salvo', target: targetEntity });
    return true;
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

    // Player units should only auto-acquire visible targets
    const fog = this.game.fogOfWar;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (enemy.isGarrisoned) continue;

      // If this unit belongs to the player team, check fog visibility
      if (fog && unit.team === 'player') {
        const ePos = enemy.getPosition();
        if (!fog.isVisible(ePos.x, ePos.z)) continue;
      }

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
