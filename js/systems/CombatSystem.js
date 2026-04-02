import * as THREE from 'three';
import { DAMAGE_MODIFIERS, NATIONS, UNIT_ABILITIES, UNIT_STATS } from '../core/Constants.js';
import { Projectile } from '../entities/Projectile.js';

export class CombatSystem {
  constructor(game) {
    this.game = game;
    this.combatIntensity = 0;
    this._intensityDecay = 2;
    // GD-075: Overkill protection - track committed damage per entity
    this._committedDamage = new Map();
  }

  getCommittedDamage(entity) {
    return this._committedDamage.get(entity.id) || 0;
  }

  addCommittedDamage(entity, amount) {
    const current = this._committedDamage.get(entity.id) || 0;
    this._committedDamage.set(entity.id, current + amount);
  }

  reduceCommittedDamage(entity, amount) {
    const current = this._committedDamage.get(entity.id) || 0;
    const newVal = Math.max(0, current - amount);
    if (newVal <= 0) {
      this._committedDamage.delete(entity.id);
    } else {
      this._committedDamage.set(entity.id, newVal);
    }
  }

  clearCommittedDamage(entity) {
    this._committedDamage.delete(entity.id);
  }

  update(delta) {
    // GD-075: Clear committed damage from previous frame - it only matters within a single update pass
    this._committedDamage.clear();

    const allUnits = this.game.entities.filter(e => e.isUnit && e.alive);
    const camera = this.game.sceneManager.camera;

    for (const unit of allUnits) {
      // Skip garrisoned, EMP-disabled, and retreating units
      if (unit.isGarrisoned) continue;
      if (unit.empDisabledTimer > 0) continue;
      if (unit.isRetreating) continue;

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

    // Handle APC garrisoned infantry firing
    const apcs = allUnits.filter(u => u.type === 'apc' && u.garrisoned && u.garrisoned.length > 0);
    for (const apc of apcs) {
      if (!apc.attackTarget || !apc.attackTarget.alive) continue;
      const dist = apc.distanceTo(apc.attackTarget);
      // Garrisoned infantry fire at 50% of infantry range
      const garrisonRange = (UNIT_STATS.infantry?.range || 6) * 3 * 0.5;
      if (dist <= garrisonRange) {
        // Each garrisoned infantry adds damage
        for (const inf of apc.garrisoned) {
          if (!inf.alive) continue;
          if (inf.attackCooldown > 0) {
            inf.attackCooldown -= delta;
            continue;
          }
          const infDmg = Math.max(1, (UNIT_STATS.infantry?.damage || 8) * 0.5);
          apc.attackTarget.takeDamage(infDmg);
          inf.attackCooldown = 1 / (UNIT_STATS.infantry?.attackRate || 1.5);
          if (!apc.attackTarget.alive) {
            if (inf.addKill) inf.addKill();
            this.game.eventBus.emit('combat:kill', { attacker: inf, defender: apc.attackTarget });
            apc.attackTarget = null;
            break;
          }
        }
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

    // Decay combat intensity
    this.combatIntensity = Math.max(0, this.combatIntensity - this._intensityDecay * delta);
  }

  performAttack(attacker, defender) {
    if (!attacker.alive || !defender.alive) return;

    // Engineers cannot attack (0 damage, non-combat unit)
    if (attacker.type === 'engineer') return;

    // GD-075: Overkill protection - skip if target is already effectively dead
    const committed = this.getCommittedDamage(defender);
    if (defender.health - committed <= 0) {
      // Target already has enough incoming damage, find new target
      attacker.attackTarget = null;
      this.autoAcquireTarget(attacker);
      return;
    }

    // Minimum range check (mortar, SPG)
    const stats = attacker.isUnit ? UNIT_STATS[attacker.type] : null;
    if (stats && stats.minRange) {
      const dist = attacker.distanceTo(defender);
      if (dist < stats.minRange * 3) return; // Too close
    }

    // Air-only targeting (AA Half-Track)
    if (stats && stats.airOnly && defender.domain !== 'air') return;

    // SPG must be deployed to fire
    if (attacker.type === 'spg' && attacker._deployed === false) return;

    // Scout car cannot attack air
    if (attacker.type === 'scoutcar' && defender.domain === 'air') return;

    // Calculate damage with modifiers
    const baseDmg = attacker.damage;
    const defenderKey = defender.isBuilding ? 'building' : defender.type;
    const modifier = DAMAGE_MODIFIERS[attacker.type]?.[defenderKey] || 1.0;

    // Apply armor reduction (each armor point reduces damage by 2%)
    const armorReduction = defender.armor ? 1 - (defender.armor * 0.02) : 1.0;

    // Terrain elevation advantage: +15% damage from high ground, -15% from low ground
    let terrainMod = 1.0;
    if (this.game.terrain && attacker.domain !== 'air' && (defender.domain !== 'air' || defender.isBuilding)) {
      const aY = attacker.getPosition().y;
      const dY = defender.getPosition().y;
      const heightDiff = aY - dY;
      if (heightDiff > 1.5) terrainMod = 1.15;
      else if (heightDiff < -1.5) terrainMod = 0.85;
    }

    // Ditch damage reduction: defenders near friendly ditches take 50% less damage
    let ditchMod = 1.0;
    if (defender.isUnit && defender.domain === 'land') {
      const dPos = defender.getPosition();
      for (const entity of this.game.entities) {
        if (!entity.alive || entity.type !== 'ditch' || entity.team !== defender.team) continue;
        const dist = entity.getPosition().distanceTo(dPos);
        if (dist < 6) { ditchMod = 0.5; break; }
      }
    }

    // Banzai Charge vulnerability (GD-058)
    let banzaiMod = 1.0;
    if (defender.isUnit && defender._banzaiVulnerability) {
      banzaiMod = defender._banzaiVulnerability;
    }

    // GD-078: Forest cover damage reduction
    let forestMod = 1.0;
    if (defender.isUnit && defender.domain === 'land' && this.game.terrain && this.game.terrain.isInForest) {
      const dPos = defender.getPosition();
      if (this.game.terrain.isInForest(dPos.x, dPos.z)) {
        if (defender.type === 'infantry') {
          forestMod = 0.75; // Infantry: -25% incoming damage in forest
        }
        // Vehicles get no damage bonus in forest
      }
    }

    // GD-111: Commander aura damage buff
    const cmdDmgMod = attacker._cmdAuraDmg || 1.0;

    // GD-125: Retreating units take -25% damage
    const retreatMod = (defender.isUnit && defender.isRetreating) ? 0.75 : 1.0;

    const finalDmg = Math.max(1, baseDmg * modifier * armorReduction * terrainMod * ditchMod * banzaiMod * forestMod * cmdDmgMod * retreatMod);

    // GD-075: Track committed damage for overkill protection
    this.addCommittedDamage(defender, finalDmg);

    // Apply damage
    defender.takeDamage(finalDmg);

    // AOE splash damage for mortar, SPG, bomber
    if (stats && stats.aoeRadius) {
      const defPos = defender.getPosition();
      const enemyTeam = attacker.team === 'player' ? 'enemy' : 'player';
      const splashTargets = this.game.getEntitiesByTeam(enemyTeam);
      for (const target of splashTargets) {
        if (!target.alive || target === defender) continue;
        const d = target.getPosition().distanceTo(defPos);
        if (d <= stats.aoeRadius) {
          const splashDmg = finalDmg * (1 - d / stats.aoeRadius) * 0.5;
          if (splashDmg > 0) target.takeDamage(splashDmg);
        }
      }
    }

    // Spatial awareness: notify if player unit attacked off-screen
    if (defender.team === 'player' && this.game.soundManager?.notifyCombatOffscreen) {
      this.game.soundManager.notifyCombatOffscreen(defender.getPosition());
    }

    // Create floating damage number
    if (this.game.effectsManager) {
      const effectiveness = modifier > 1.1 ? 'high' : modifier < 0.9 ? 'low' : 'normal';
      this.game.effectsManager.createDamageNumber(defender.getPosition().clone(), finalDmg, effectiveness);
    }

    // Reset attack cooldown on the attacker (this is the ONLY place it's set)
    attacker.attackCooldown = 1 / attacker.attackRate;

    // GD-074: Submarine stealth reveal on firing
    if (attacker.type === 'submarine' && attacker.onFired) {
      attacker.onFired();
    }

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
      // GD-065: Projectile trail
      this.game.effectsManager.createProjectileTrail(attackerPos, defenderPos);
    }

    // GD-108: Trigger recoil animation
    if (attacker.triggerRecoil) attacker.triggerRecoil();

    // Play attack sound (unit-type-specific)
    if (this.game.soundManager) {
      this.game.soundManager.play('attack', { unitType: attacker.type });
      this.game.soundManager.notifyCombat();
    }

    // Track combat intensity
    this.combatIntensity = Math.min(10, this.combatIntensity + 0.5);

    // Camera shake on heavy attacks
    if (this.game.cameraController) {
      const shakeAmount = finalDmg > 30 ? 0.5 : finalDmg > 15 ? 0.2 : 0.05;
      this.game.cameraController.shake(shakeAmount);
    }

    // Red vignette when player units take heavy hits
    if (defender.team === 'player' && finalDmg > 20 && this.game.effectsManager) {
      this.game.effectsManager.createDamageVignette();
    }

    // Emit combat event
    this.game.eventBus.emit('combat:attack', {
      attacker,
      defender,
      damage: finalDmg
    });

    // Check if defender was killed
    if (!defender.alive) {
      // GD-075: Clear committed damage on death
      this.clearCommittedDamage(defender);

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

      // GD-105: Faction on-death effects (Zero kamikaze)
      if (defender.factionOnDeath && defender.factionOnDeath.type === 'kamikaze') {
        const deathPos = defender.getPosition();
        const kamiDmg = defender.factionOnDeath.damage;
        const kamiRadius = defender.factionOnDeath.radius;
        const enemyTeam = defender.team === 'player' ? 'enemy' : 'player';
        const targets = this.game.getEntitiesByTeam(enemyTeam);
        for (const target of targets) {
          if (!target.alive) continue;
          const d = target.getPosition().distanceTo(deathPos);
          if (d <= kamiRadius) {
            const dmg = kamiDmg * (1 - d / kamiRadius);
            if (dmg > 0) target.takeDamage(dmg);
          }
        }
        if (this.game.effectsManager) {
          this.game.effectsManager.createExplosion(deathPos, kamiRadius * 0.5);
        }
        if (this.game.cameraController) {
          this.game.cameraController.shake(1.5);
        }
      }

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

    // Terrain elevation advantage for turrets
    let terrainMod = 1.0;
    if (this.game.terrain && (defender.domain !== 'air' || defender.isBuilding)) {
      const tY = turret.getPosition().y;
      const dY = defender.getPosition().y;
      const heightDiff = tY - dY;
      if (heightDiff > 1.5) terrainMod = 1.15;
      else if (heightDiff < -1.5) terrainMod = 0.85;
    }

    // Ditch damage reduction for turret attacks
    let ditchMod = 1.0;
    if (defender.isUnit && defender.domain === 'land') {
      const dPos = defender.getPosition();
      for (const entity of this.game.entities) {
        if (!entity.alive || entity.type !== 'ditch' || entity.team !== defender.team) continue;
        const dist = entity.getPosition().distanceTo(dPos);
        if (dist < 6) { ditchMod = 0.5; break; }
      }
    }

    const finalDmg = Math.max(1, baseDmg * modifier * armorReduction * terrainMod * ditchMod);

    defender.takeDamage(finalDmg);
    turret.attackCooldown = 1 / turret.attackRate;

    // Spatial awareness: notify if player unit attacked off-screen
    if (defender.team === 'player' && this.game.soundManager?.notifyCombatOffscreen) {
      this.game.soundManager.notifyCombatOffscreen(defender.getPosition());
    }

    // Create floating damage number
    if (this.game.effectsManager) {
      const effectiveness = modifier > 1.1 ? 'high' : modifier < 0.9 ? 'low' : 'normal';
      this.game.effectsManager.createDamageNumber(defender.getPosition().clone(), finalDmg, effectiveness);
    }

    // Projectile visual
    const projectile = new Projectile(turret, defender, 0, 100);
    this.game.addProjectile(projectile);

    if (this.game.effectsManager) {
      this.game.effectsManager.createMuzzleFlash(turret.getPosition());
    }

    if (this.game.soundManager) {
      this.game.soundManager.play('attack');
    }

    // Camera shake on turret attacks
    if (this.game.cameraController) {
      const shakeAmount = finalDmg > 30 ? 0.5 : finalDmg > 15 ? 0.2 : 0.05;
      this.game.cameraController.shake(shakeAmount);
    }

    // Red vignette when player units take heavy turret hits
    if (defender.team === 'player' && finalDmg > 20 && this.game.effectsManager) {
      this.game.effectsManager.createDamageVignette();
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

    // Check MU cost
    if (abilityDef.muCost && abilityDef.muCost > 0) {
      const team = unit.team;
      if (this.game.resourceSystem && !this.game.resourceSystem.canAffordMU(team, abilityDef.muCost)) {
        if (this.game.uiManager?.hud && team === 'player') {
          this.game.uiManager.hud.showNotification(`Not enough MU (need ${abilityDef.muCost})`, '#ff4444');
        }
        if (this.game.soundManager && team === 'player') this.game.soundManager.play('error');
        return false;
      }
      // Spend MU
      if (this.game.resourceSystem) {
        this.game.resourceSystem.spendMU(team, abilityDef.muCost);
      }
    }

    // Check faction ability overrides first
    const factionAbility = unit.ability;
    if (factionAbility && factionAbility.id === 'banzai') {
      unit.activateBanzai();
      this.game.eventBus.emit('ability:used', { unit, ability: 'banzai' });
      return true;
    }
    if (factionAbility && factionAbility.id === 'smoke_pop') {
      return this.executeSmokeScreen(unit, targetPos || unit.getPosition());
    }

    switch (abilityDef.id) {
      case 'grenade': return this.executeGrenade(unit, targetPos);
      case 'siege_mode': return this.executeSiegeMode(unit);
      case 'emp': return this.executeEMP(unit, targetEntity);
      case 'bombing_run': return this.executeBombingRun(unit, targetPos);
      case 'barrage': return this.executeBarrage(unit, targetPos);
      case 'launch_squadron': return this.executeLaunchSquadron(unit, targetPos);
      case 'torpedo_salvo': return this.executeTorpedoSalvo(unit, targetEntity);
      case 'smoke_screen': return this.executeSmokeScreen(unit, targetPos);
      case 'flare': return this.executeFlare(unit, targetPos);
      case 'deploy': return this.executeDeploy(unit);
      case 'sonar_ping': return this.executeSonarPing(unit);
      case 'plant_mine': return this.executePlantMine(unit);
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
    if (this.game.cameraController) this.game.cameraController.shake(1.0);
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
    if (this.game.cameraController) this.game.cameraController.shake(1.0);
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
        if (!unit.alive || this.game.state !== 'PLAYING') return;
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
        if (this.game.cameraController) this.game.cameraController.shake(1.0);
      }, salvo * 800);
    }
    this.game.eventBus.emit('ability:used', { unit, ability: 'barrage', target: targetPos });
    return true;
  }

  executeLaunchSquadron(unit, targetPos) {
    const ab = UNIT_ABILITIES.carrier;
    if (unit.getPosition().distanceTo(targetPos) > ab.range * 3) return false;
    unit.abilityCooldown = ab.cooldown;

    // GD-062: Use new carrier drone launch system
    if (unit.launchSquadron) {
      unit.launchSquadron(targetPos, ab.squadronDuration);
    } else {
      // Fallback for non-reworked carriers
      const enemyTeam = unit.team === 'player' ? 'enemy' : 'player';
      const interval = ab.squadronDuration / ab.squadronCount;
      for (let i = 0; i < ab.squadronCount; i++) {
        setTimeout(() => {
          if (!unit.alive || this.game.state !== 'PLAYING') return;
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

  executeSmokeScreen(unit, targetPos) {
    const ab = UNIT_ABILITIES.mortar;
    if (!ab) return false;
    const unitPos = unit.getPosition();
    if (unitPos.distanceTo(targetPos) > ab.range * 3) return false;
    unit.abilityCooldown = ab.cooldown;

    // Create a smoke effect at target position
    if (this.game.effectsManager) {
      this.game.effectsManager.createExplosion(targetPos);
    }

    // Smoke blocks vision: temporarily reduce vision for enemies near the smoke
    // We'll track active smoke zones on the game object
    if (!this.game._smokeZones) this.game._smokeZones = [];
    this.game._smokeZones.push({
      position: targetPos.clone(),
      radius: ab.radius,
      timer: ab.duration,
      team: unit.team
    });

    if (this.game.soundManager) this.game.soundManager.play('explosion');
    this.game.eventBus.emit('ability:used', { unit, ability: 'smoke_screen', target: targetPos });
    return true;
  }

  executeFlare(unit, targetPos) {
    const ab = UNIT_ABILITIES.scoutcar;
    if (!ab) return false;
    const unitPos = unit.getPosition();
    if (unitPos.distanceTo(targetPos) > ab.range * 3) return false;
    unit.abilityCooldown = ab.cooldown;

    // Temporarily reveal an area through fog of war
    if (this.game.fogOfWar) {
      if (!this.game._flareZones) this.game._flareZones = [];
      this.game._flareZones.push({
        position: targetPos.clone(),
        radius: ab.radius,
        timer: ab.duration
      });
    }

    if (this.game.effectsManager) {
      this.game.effectsManager.createMuzzleFlash(targetPos);
    }
    if (this.game.soundManager) this.game.soundManager.play('attack');
    this.game.eventBus.emit('ability:used', { unit, ability: 'flare', target: targetPos });
    return true;
  }

  executeDeploy(unit) {
    if (unit.type !== 'spg' || !unit.toggleDeploy) return false;
    unit.toggleDeploy();
    if (this.game.soundManager) this.game.soundManager.play('build');
    this.game.eventBus.emit('ability:used', { unit, ability: 'deploy', active: unit._deployed });
    return true;
  }

  executeSonarPing(unit) {
    const ab = UNIT_ABILITIES.patrolboat;
    if (!ab) return false;
    unit.abilityCooldown = ab.cooldown;

    // Reveal submarines in radius for duration
    const unitPos = unit.getPosition();
    const enemyTeam = unit.team === 'player' ? 'enemy' : 'player';
    const enemies = this.game.getUnits(enemyTeam);

    for (const enemy of enemies) {
      if (enemy.type !== 'submarine' || !enemy.alive) continue;
      const dist = enemy.getPosition().distanceTo(unitPos);
      if (dist <= ab.radius * 3) {
        // Temporarily make submarine visible
        enemy._sonarRevealed = ab.duration;
      }
    }

    if (this.game.effectsManager) {
      this.game.effectsManager.createMuzzleFlash(unitPos);
    }
    if (this.game.soundManager) this.game.soundManager.play('select');
    this.game.eventBus.emit('ability:used', { unit, ability: 'sonar_ping' });
    return true;
  }

  executePlantMine(unit) {
    if (!unit.plantMine) return false;
    const ab = UNIT_ABILITIES.engineer;
    if (!ab) return false;

    const success = unit.plantMine();
    if (success) {
      unit.abilityCooldown = ab.cooldown;
      if (this.game.soundManager) this.game.soundManager.play('build');
      if (this.game.uiManager?.hud && unit.team === 'player') {
        this.game.uiManager.hud.showNotification('Mine planted!', '#ffcc00');
      }
      this.game.eventBus.emit('ability:used', { unit, ability: 'plant_mine' });
    }
    return success;
  }

  autoAcquireTarget(unit) {
    // Hold fire stance: never auto-acquire targets
    if (unit.stance === 'holdfire') return;

    // GD-062: Carriers have no direct attack (drones handle it)
    if (unit.damage <= 0) return;

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

    // Get unit stats for special targeting rules
    const unitStats = UNIT_STATS[unit.type];

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (enemy.isGarrisoned) continue;

      // Air-only targeting (AA Half-Track)
      if (unitStats && unitStats.airOnly && enemy.domain !== 'air') continue;

      // Scout car cannot target air
      if (unit.type === 'scoutcar' && enemy.domain === 'air') continue;

      // GD-074: Cannot auto-acquire stealthed submarines
      if (enemy.type === 'submarine' && enemy.isStealthed && enemy.isStealthed()) continue;

      // If this unit belongs to the player team, check fog visibility
      if (fog && unit.team === 'player') {
        const ePos = enemy.getPosition();
        if (!fog.isVisible(ePos.x, ePos.z)) continue;
      }

      const dist = unit.distanceTo(enemy);

      // Minimum range check
      if (unitStats && unitStats.minRange && dist < unitStats.minRange * 3) continue;

      // GD-075: Skip overkill targets
      const committedDmg = this.getCommittedDamage(enemy);
      if (enemy.health - committedDmg <= 0) continue;

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
