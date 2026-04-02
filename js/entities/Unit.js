import * as THREE from 'three';
import { Entity } from './Entity.js';
import { UNIT_STATS, GAME_CONFIG, NATIONS, UNIT_ABILITIES, VETERANCY, FORMATION_CONFIG } from '../core/Constants.js';

export class Unit extends Entity {
  constructor(type, team, position, stats) {
    super(type, team, position);
    this.isUnit = true;

    const s = stats || UNIT_STATS[type];
    this.baseSpeed = s.speed;
    this.baseDamage = s.damage;
    this.baseRange = s.range;
    this.baseMaxHP = s.hp;
    this.baseArmor = s.armor || 0;
    this.baseAttackRate = s.attackRate || 1.0;

    this.speed = s.speed;
    this.damage = s.damage;
    this.range = s.range;
    this.domain = s.domain;
    this.health = s.hp;
    this.maxHealth = s.hp;
    this.cost = s.cost;
    this.armor = s.armor || 0;
    this.vision = s.vision || 10;
    this.attackRate = s.attackRate || 1.0;

    this.moveTarget = null;
    this.attackTarget = null;
    this.attackCooldown = 0;
    this.isMoving = false;

    this.waypoints = [];
    this._attackMove = false;
    this.formationSpeed = null;

    // Game reference (set by Game.createUnit)
    this.game = null;

    // For air units, float height
    this.flyHeight = this.domain === 'air' ? 15 : 0;

    // Model facing offset: models built facing +X need -π/2 to align with atan2(dx,dz) which assumes +Z
    const xFacingTypes = ['tank', 'plane', 'battleship', 'carrier', 'submarine'];
    this.modelRotationOffset = xFacingTypes.includes(type) ? -Math.PI / 2 : 0;

    // --- Nation bonus tracking ---
    this.nation = null; // set after construction via applyNationBonuses()

    // --- Ability system ---
    this.ability = UNIT_ABILITIES[type] ? { ...UNIT_ABILITIES[type] } : null;
    this.abilityCooldown = 0;
    this.abilityActive = false; // for toggles like siege mode
    this.empDisabledTimer = 0;  // EMP disable timer (applied by others)

    // Siege mode saved stats
    this._siegeMode = false;
    this._preSiegeRange = 0;
    this._preSiegeDamage = 0;
    this._preSiegeSpeed = 0;

    // --- Veterancy system ---
    this.kills = 0;
    this.veterancyRank = 0; // index into VETERANCY.ranks
    this.rankIndicator = null; // THREE mesh for rank stars
  }

  // Apply nation-specific bonuses to this unit's stats
  applyNationBonuses(nationKey) {
    this.nation = nationKey;
    const nationData = NATIONS[nationKey];
    if (!nationData || !nationData.bonuses) return;

    const b = nationData.bonuses;

    // Infantry damage bonus
    if (this.type === 'infantry' && b.infantryDamage) {
      this.baseDamage = this.baseDamage * b.infantryDamage;
      this.damage = this.baseDamage;
    }

    // Tank bonuses
    if (this.type === 'tank') {
      if (b.tankDamage) {
        this.baseDamage = this.baseDamage * b.tankDamage;
        this.damage = this.baseDamage;
      }
      if (b.tankSpeed) {
        this.baseSpeed = this.baseSpeed * b.tankSpeed;
        this.speed = this.baseSpeed;
      }
    }

    // Air damage bonus
    if (this.domain === 'air' && b.airDamage) {
      this.baseDamage = this.baseDamage * b.airDamage;
      this.damage = this.baseDamage;
    }

    // Air speed bonus
    if (this.domain === 'air' && b.airSpeed) {
      this.baseSpeed = this.baseSpeed * b.airSpeed;
      this.speed = this.baseSpeed;
    }

    // Naval HP bonus
    if (this.domain === 'naval' && b.navalHP) {
      this.baseMaxHP = Math.round(this.baseMaxHP * b.navalHP);
      this.maxHealth = this.baseMaxHP;
      this.health = this.baseMaxHP;
    }

    // Armor bonus (multiplier on base armor)
    if (b.allArmor && this.baseArmor > 0) {
      this.baseArmor = Math.round(this.baseArmor * b.allArmor);
      this.armor = this.baseArmor;
    }
  }

  // Get effective armor (includes nation + veterancy bonuses)
  getEffectiveArmor() {
    return this.armor;
  }

  // --- Veterancy ---
  addKill() {
    this.kills++;
    const ranks = VETERANCY.ranks;
    let newRank = 0;
    for (let i = ranks.length - 1; i >= 0; i--) {
      if (this.kills >= ranks[i].kills) {
        newRank = i;
        break;
      }
    }
    if (newRank > this.veterancyRank) {
      this.promote(newRank);
    }
  }

  promote(newRank) {
    const oldRank = this.veterancyRank;
    this.veterancyRank = newRank;
    const rankDiff = newRank - oldRank;
    const bp = VETERANCY.bonusPerRank;

    // Apply stat bonuses for each rank gained
    for (let i = 0; i < rankDiff; i++) {
      this.baseDamage *= (1 + bp.damage);
      this.baseMaxHP *= (1 + bp.maxHP);
      this.baseArmor += bp.armor;
      this.baseSpeed *= (1 + bp.speed);
    }

    // Update effective stats
    this.damage = this.baseDamage;
    this.maxHealth = Math.round(this.baseMaxHP);
    this.health = Math.min(this.health + Math.round(this.baseMaxHP * bp.maxHP * rankDiff), this.maxHealth); // heal a bit on promote
    this.armor = this.baseArmor;
    this.speed = this.baseSpeed;

    // If in siege mode, re-apply siege bonuses on top
    if (this._siegeMode) {
      const ab = UNIT_ABILITIES.tank;
      this.range = this.baseRange * ab.rangeBonus;
      this.damage = this.baseDamage * ab.damageBonus;
      this.speed = 0;
    }

    // Update rank indicator visual
    this.updateRankIndicator();

    // Emit event
    if (this.game) {
      this.game.eventBus.emit('unit:promoted', {
        unit: this,
        rank: VETERANCY.ranks[newRank],
        rankIndex: newRank
      });
    }
  }

  updateRankIndicator() {
    if (!this.mesh) return;

    // Remove old indicator
    if (this.rankIndicator) {
      this.mesh.remove(this.rankIndicator);
      this.rankIndicator.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }

    const rank = VETERANCY.ranks[this.veterancyRank];
    if (!rank || this.veterancyRank === 0) return; // no indicator for rookies

    // Create star indicator group above unit
    const group = new THREE.Group();
    const starCount = this.veterancyRank;
    const starSize = 0.4;
    const spacing = 0.6;
    const startX = -(starCount - 1) * spacing / 2;
    const colorHex = parseInt(rank.color.replace('#', ''), 16);

    for (let i = 0; i < starCount; i++) {
      // Simple diamond shape for a star
      const geo = new THREE.OctahedronGeometry(starSize, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.9
      });
      const star = new THREE.Mesh(geo, mat);
      star.position.x = startX + i * spacing;
      star.scale.y = 0.5; // flatten to diamond
      group.add(star);
    }

    group.position.y = 6.5; // above health bar
    this.mesh.add(group);
    this.rankIndicator = group;
  }

  // --- Abilities ---
  canUseAbility() {
    if (!this.ability) return false;
    if (this.abilityCooldown > 0) return false;
    if (this.empDisabledTimer > 0) return false;
    return true;
  }

  getAbilityCooldownPercent() {
    if (!this.ability) return 0;
    if (this.abilityCooldown <= 0) return 1;
    return 1 - (this.abilityCooldown / this.ability.cooldown);
  }

  // Toggle siege mode (tank only)
  toggleSiegeMode() {
    if (this.type !== 'tank') return;
    const ab = UNIT_ABILITIES.tank;

    if (this._siegeMode) {
      // Exit siege mode
      this._siegeMode = false;
      this.abilityActive = false;
      this.range = this.baseRange;
      this.damage = this.baseDamage;
      this.speed = this.baseSpeed;
      this.abilityCooldown = ab.cooldown;
    } else {
      // Enter siege mode
      this._siegeMode = true;
      this.abilityActive = true;
      this._preSiegeRange = this.range;
      this._preSiegeDamage = this.damage;
      this._preSiegeSpeed = this.speed;
      this.range = this.baseRange * ab.rangeBonus;
      this.damage = this.baseDamage * ab.damageBonus;
      this.speed = 0;
      // Stop moving
      this.moveTarget = null;
      this.waypoints = [];
      this.isMoving = false;
      this.abilityCooldown = ab.cooldown;
    }
  }

  // Move to position (clears attack target - explicit move command)
  moveTo(target) {
    // Cannot move in siege mode
    if (this._siegeMode) return;
    // Cannot move if EMP disabled
    if (this.empDisabledTimer > 0) return;

    this.moveTarget = target.clone();
    if (this.domain !== 'air') {
      this.moveTarget.y = 0;
    }
    this.attackTarget = null;
    this._attackMove = false;
    this.isMoving = true;
    this.waypoints = [];
  }

  // Follow a path of waypoints
  followPath(waypoints) {
    if (!waypoints || waypoints.length === 0) return;
    if (this._siegeMode) return;
    if (this.empDisabledTimer > 0) return;

    this.waypoints = waypoints.map(w => w.clone());
    // Set first waypoint as immediate move target
    this.moveTarget = this.waypoints.shift();
    if (this.domain !== 'air') {
      this.moveTarget.y = 0;
    }
    this.isMoving = true;
  }

  // Chase/move toward target without clearing attack target (for combat pursuit)
  chasePosition(target) {
    if (this._siegeMode) return;
    if (this.empDisabledTimer > 0) return;

    this.moveTarget = target.clone();
    if (this.domain !== 'air') {
      this.moveTarget.y = 0;
    }
    this.isMoving = true;
    // Do NOT clear attackTarget - this is a chase move
  }

  attackEntity(target) {
    if (this.empDisabledTimer > 0) return;
    this.attackTarget = target;
  }

  stop() {
    this.moveTarget = null;
    this.attackTarget = null;
    this.isMoving = false;
    this.waypoints = [];
    this._attackMove = false;
    this.formationSpeed = null;
  }

  update(deltaTime) {
    if (!this.alive || !this.mesh) return;

    // Tick ability cooldown
    if (this.abilityCooldown > 0) {
      this.abilityCooldown -= deltaTime;
      if (this.abilityCooldown < 0) this.abilityCooldown = 0;
    }

    // Tick EMP disable timer
    if (this.empDisabledTimer > 0) {
      this.empDisabledTimer -= deltaTime;
      if (this.empDisabledTimer <= 0) {
        this.empDisabledTimer = 0;
      }
      // While disabled: cannot attack or move
      return;
    }

    // Tick attack cooldown (CombatSystem sets cooldown, we just count down)
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }

    // Rotate rank indicator to face camera (billboard)
    if (this.rankIndicator && this.game && this.game.sceneManager) {
      const camera = this.game.sceneManager.camera;
      if (camera) {
        this.rankIndicator.quaternion.copy(camera.quaternion);
      }
    }

    // Movement
    if (this.moveTarget) {
      const pos = this.mesh.position;
      let dx = this.moveTarget.x - pos.x;
      let dz = this.moveTarget.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 1) {
        const effSpeed = this.formationSpeed !== null ? Math.min(this.formationSpeed, this.speed) : this.speed;
        const moveAmount = effSpeed * deltaTime * GAME_CONFIG.unitSpeedMultiplier;

        let sepX = 0, sepZ = 0;
        if (this.game) {
          const nearby = this.game.getUnits(this.team);
          const sepR = FORMATION_CONFIG.separationRadius;
          const sepR2 = sepR * sepR;
          for (const other of nearby) {
            if (other === this || !other.alive || !other.mesh) continue;
            const odx = pos.x - other.mesh.position.x;
            const odz = pos.z - other.mesh.position.z;
            const d2 = odx * odx + odz * odz;
            if (d2 > 0 && d2 < sepR2) {
              const d = Math.sqrt(d2);
              const strength = (sepR - d) / sepR;
              sepX += (odx / d) * strength;
              sepZ += (odz / d) * strength;
            }
          }
        }
        const sepForce = FORMATION_CONFIG.separationForce * deltaTime;
        dx += sepX * sepForce;
        dz += sepZ * sepForce;
        const adjDist = Math.sqrt(dx * dx + dz * dz);

        const ratio = Math.min(moveAmount / adjDist, 1);
        const nextX = pos.x + dx * ratio;
        const nextZ = pos.z + dz * ratio;

        // Block land units from entering water
        if (this.domain === 'land' && this.game && this.game.terrain && this.game.terrain.isWater(nextX, nextZ)) {
          // Can't cross water — stop movement
          this.moveTarget = null;
          this.waypoints = [];
          this.isMoving = false;
          return;
        }

        pos.x = nextX;
        pos.z = nextZ;

        // Face movement direction
        this.mesh.rotation.y = Math.atan2(dx, dz) + this.modelRotationOffset;
        this.isMoving = true;

        // Update Y position from terrain for land units
        if (this.domain === 'land' && this.game && this.game.terrain) {
          pos.y = this.game.terrain.getHeightAt(pos.x, pos.z);
        }

        // Tank crush: run over enemy infantry
        if (this.type === 'tank' && this.game) {
          const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
          const enemies = this.game.getUnits(enemyTeam);
          for (const enemy of enemies) {
            if (enemy.type !== 'infantry' || !enemy.alive || enemy.isGarrisoned) continue;
            const d = this.distanceTo(enemy);
            if (d < 2.5) {
              // Crush! Deal heavy damage
              const crushDmg = 40;
              enemy.takeDamage(crushDmg);
              if (this.game.effectsManager) {
                this.game.effectsManager.createMuzzleFlash(enemy.getPosition());
              }
              if (!enemy.alive) {
                if (this.addKill) this.addKill();
                this.game.eventBus.emit('combat:kill', { attacker: this, defender: enemy });
                if (this.game.soundManager) this.game.soundManager.play('death', { unitType: 'infantry' });
              }
            }
          }
        }
      } else {
        if (this.waypoints.length > 0) {
          this.moveTarget = this.waypoints.shift();
          if (this.domain !== 'air') {
            this.moveTarget.y = 0;
          }
        } else {
          this.moveTarget = null;
          this.isMoving = false;
          this.formationSpeed = null;
        }
      }
    }

    // Handle air unit height
    if (this.flyHeight > 0) {
      this.mesh.position.y = this.flyHeight + Math.sin(Date.now() * 0.002) * 0.5;
    }

    // Chase attack target if we have one and it's out of range
    if (this.attackTarget) {
      if (!this.attackTarget.alive) {
        this.attackTarget = null;
        return;
      }

      const dist = this.distanceTo(this.attackTarget);
      const worldRange = this.range * 3; // range in world units

      if (dist > worldRange) {
        // Out of range - chase the target (don't clear attackTarget)
        this.chasePosition(this.attackTarget.getPosition());
      } else {
        // In range - stop moving, face target (CombatSystem handles actual firing)
        this.moveTarget = null;
        this.waypoints = [];
        this.isMoving = false;

        // Face target
        const targetPos = this.attackTarget.getPosition();
        const fdx = targetPos.x - this.mesh.position.x;
        const fdz = targetPos.z - this.mesh.position.z;
        this.mesh.rotation.y = Math.atan2(fdx, fdz) + this.modelRotationOffset;
      }
    }
  }

  canAttack() {
    if (this.empDisabledTimer > 0) return false;
    return this.attackCooldown <= 0;
  }

  isInRange(target) {
    return this.distanceTo(target) <= this.range * 3;
  }
}
