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
    this._pathPending = false;
    this.formationSpeed = null;

    // Stance system: 'aggressive' (default), 'defensive', 'holdfire'
    this.stance = 'aggressive';

    // GD-125: Retreat system
    this.isRetreating = false;
    this.retreatTarget = null;
    this._retreatFlashTimer = 0;

    // Patrol system
    this._patrolPoints = [];
    this._patrolIndex = 0;
    this._isPatrolling = false;

    // Game reference (set by Game.createUnit)
    this.game = null;

    // For air units, float height
    this.flyHeight = this.domain === 'air' ? 15 : 0;

    // Model facing offset: models built facing +X need -π/2 to align with atan2(dx,dz) which assumes +Z
    const xFacingTypes = ['tank', 'plane', 'battleship', 'carrier', 'submarine', 'scoutcar', 'aahalftrack', 'apc', 'heavytank', 'spg', 'bomber', 'patrolboat'];
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

    // Status badge (stance/order indicator)
    this._statusBadge = null;
    this._lastBadgeState = '';
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

    // Ace rank: full heal on promotion
    if (newRank >= 3) {
      this.health = this.maxHealth;
    }
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

    // Add glow aura for Elite+ ranks
    if (this.veterancyRank >= 2) {
      const auraGeo = new THREE.RingGeometry(1.5, 2.0, 24);
      const auraMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const aura = new THREE.Mesh(auraGeo, auraMat);
      aura.rotation.x = -Math.PI / 2;
      group.add(aura);
    }

    group.position.y = 6.5; // above health bar

    // Position aura at ground level (after group.position.y is set)
    if (this.veterancyRank >= 2) {
      const auraChild = group.children.find(c => c.geometry?.type === 'RingGeometry');
      if (auraChild) auraChild.position.y = -6.5 + 0.3;
    }
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
    this._isPatrolling = false;
    this._patrolPoints = [];
    this._patrolIndex = 0;
    // GD-125: Cancel retreat on stop
    this.isRetreating = false;
    this.retreatTarget = null;
    this._retreatFlashTimer = 0;
    if (this.mesh) {
      this.mesh.traverse(child => {
        if (child.isMesh && child.material && child.material.emissive) {
          child.material.emissive.setHex(0x000000);
        }
      });
    }
  }

  // GD-125: Start tactical retreat to nearest friendly building
  startRetreat(targetPos) {
    if (!targetPos) return;
    this.isRetreating = true;
    this.retreatTarget = targetPos.clone();
    this.attackTarget = null;
    this.moveTarget = null;
    this.waypoints = [];
    this._attackMove = false;
    this._isPatrolling = false;
    this._retreatFlashTimer = 0;
  }

  updateStatusBadge() {
    if (!this.mesh) return;

    // Determine badge state — priority: stance/order overrides, then activity status
    let badgeState = '';
    if (this.isRetreating) badgeState = 'retreat';
    else if (this.stance === 'holdfire') badgeState = 'holdfire';
    else if (this.stance === 'defensive') badgeState = 'defensive';
    else if (this._isPatrolling) badgeState = 'patrol';
    else if (this._attackMove) badgeState = 'attackmove';
    else if (this._siegeMode) badgeState = 'siege';
    else if (this.attackTarget) badgeState = 'attacking';
    else if (this.moveTarget) badgeState = 'moving';
    else badgeState = 'idle';

    // Only update if state changed
    if (badgeState === this._lastBadgeState) return;
    this._lastBadgeState = badgeState;

    // Remove old badge
    if (this._statusBadge) {
      this.mesh.remove(this._statusBadge);
      this._statusBadge.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (c.material.map) c.material.map.dispose();
          c.material.dispose();
        }
      });
      this._statusBadge = null;
    }

    // No badge for idle state
    if (badgeState === 'idle') return;

    // Create badge — use canvas-based icons for activity states, circles for stances
    const badgeColors = {
      holdfire: 0xffcc00,
      defensive: 0x4488ff,
      patrol: 0x00ccff,
      attackmove: 0xff4444,
      siege: 0xff8800,
      retreat: 0xffffff,
      moving: 0x44ff44,
      attacking: 0xff4444
    };

    const color = badgeColors[badgeState] || 0xffffff;

    // For moving/attacking, use a canvas icon sprite
    if (badgeState === 'moving' || badgeState === 'attacking') {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 64, 64);

      if (badgeState === 'moving') {
        // Arrow pointing up
        ctx.fillStyle = '#44ff44';
        ctx.beginPath();
        ctx.moveTo(32, 8);   // top
        ctx.lineTo(48, 40);  // bottom right
        ctx.lineTo(36, 36);
        ctx.lineTo(36, 56);  // shaft bottom right
        ctx.lineTo(28, 56);  // shaft bottom left
        ctx.lineTo(28, 36);
        ctx.lineTo(16, 40);  // bottom left
        ctx.closePath();
        ctx.fill();
      } else {
        // Crosshair for attacking
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 4;
        // Outer circle
        ctx.beginPath();
        ctx.arc(32, 32, 20, 0, Math.PI * 2);
        ctx.stroke();
        // Cross lines
        ctx.beginPath();
        ctx.moveTo(32, 6); ctx.lineTo(32, 58);
        ctx.moveTo(6, 32); ctx.lineTo(58, 32);
        ctx.stroke();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.8, 0.8, 1);
      sprite.position.set(1.5, 4, 0);
      this.mesh.add(sprite);
      this._statusBadge = sprite;
    } else {
      const geo = new THREE.CircleGeometry(0.3, 8);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const badge = new THREE.Mesh(geo, mat);
      badge.position.set(1.5, 4, 0);
      this.mesh.add(badge);
      this._statusBadge = badge;
    }
  }

  cycleStance() {
    const stances = ['aggressive', 'defensive', 'holdfire'];
    const idx = stances.indexOf(this.stance);
    this.stance = stances[(idx + 1) % stances.length];
    return this.stance;
  }

  startPatrol(points) {
    if (!points || points.length < 2) return;
    this._patrolPoints = points.map(p => p.clone());
    this._patrolIndex = 0;
    this._isPatrolling = true;
    this._attackMove = true;
    this.moveTarget = this._patrolPoints[0].clone();
    this.isMoving = true;
  }

  update(deltaTime) {
    if (!this.alive || !this.mesh) return;

    // ===== GD-108: Procedural Animation State =====
    this._animTime = (this._animTime || 0) + deltaTime;
    this.updateProceduralAnimation(deltaTime);

    // ===== GD-105: Faction passive updates =====
    this.updateFactionPassives(deltaTime);

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

    // Ace passive: 20% faster attack rate (replace normal decay with boosted)
    if (this.veterancyRank >= 3 && this.attackCooldown > 0) {
      // Already decayed by deltaTime above, add only the 20% bonus portion
      this.attackCooldown -= deltaTime * 0.2;
      if (this.attackCooldown < 0) this.attackCooldown = 0;
    }

    // Rotate rank indicator to face camera (billboard)
    if (this.rankIndicator && this.game && this.game.sceneManager) {
      const camera = this.game.sceneManager.camera;
      if (camera) {
        this.rankIndicator.quaternion.copy(camera.quaternion);
      }
    }

    // GD-125: Retreat logic
    if (this.isRetreating && this.retreatTarget) {
      const pos = this.mesh.position;
      const dx = this.retreatTarget.x - pos.x;
      const dz = this.retreatTarget.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= 5) {
        // Reached friendly building - end retreat
        this.isRetreating = false;
        this.retreatTarget = null;
        this.moveTarget = null;
        this.isMoving = false;
        this._retreatFlashTimer = 0;
        // Restore opacity
        this.mesh.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.emissive?.setHex(0x000000);
          }
        });
      } else {
        // Move toward retreat target at +40% speed
        let effSpeed = this.speed * 1.4;
        if (this.domain === 'land' && this.game && this.game.weatherSystem) {
          effSpeed *= this.game.weatherSystem.getSpeedMultiplier();
        }
        const moveAmount = effSpeed * deltaTime * GAME_CONFIG.unitSpeedMultiplier;
        const ratio = Math.min(moveAmount / dist, 1);
        pos.x += dx * ratio;
        pos.z += dz * ratio;
        this.mesh.rotation.y = Math.atan2(dx, dz) + this.modelRotationOffset;
        this.isMoving = true;
        if (this.domain === 'land' && this.game && this.game.terrain) {
          pos.y = this.game.terrain.getHeightAt(pos.x, pos.z);
        }

        // White flash effect — use cached mesh children to avoid traverse() every frame
        this._retreatFlashTimer += deltaTime;
        const flash = Math.sin(this._retreatFlashTimer * 6) > 0.3;
        if (!this._emissiveChildren) {
          this._emissiveChildren = [];
          this.mesh.traverse(child => {
            if (child.isMesh && child.material && child.material.emissive) {
              this._emissiveChildren.push(child);
            }
          });
        }
        const flashHex = flash ? 0x444444 : 0x000000;
        for (let ci = 0, clen = this._emissiveChildren.length; ci < clen; ci++) {
          this._emissiveChildren[ci].material.emissive.setHex(flashHex);
        }
      }

      // Update status badge and procedural animation, then return (skip normal movement)
      this.updateStatusBadge();
      return;
    }

    // Update status badge
    this.updateStatusBadge();

    // Movement
    if (this.moveTarget) {
      const pos = this.mesh.position;
      let dx = this.moveTarget.x - pos.x;
      let dz = this.moveTarget.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 1) {
        let effSpeed = this.formationSpeed !== null ? Math.min(this.formationSpeed, this.speed) : this.speed;

        // GD-112: Weather speed effect
        if (this.domain === 'land' && this.game && this.game.weatherSystem) {
          effSpeed *= this.game.weatherSystem.getSpeedMultiplier();
        }

        // GD-111: Commander aura speed buff
        if (this._cmdAuraSpd) {
          effSpeed *= this._cmdAuraSpd;
        }

        // GD-078: Forest speed reduction (Jaeger faction passive: no forest penalty)
        if (this.domain === 'land' && this.game && this.game.terrain && this.game.terrain.isInForest) {
          if (this.game.terrain.isInForest(pos.x, pos.z)) {
            const noForestPenalty = this.factionPassive && this.factionPassive.noForestPenalty;
            if (!noForestPenalty) {
              if (this.type === 'infantry') {
                effSpeed = Math.max(1, effSpeed - 1); // Infantry: -1 speed in forest
              } else {
                effSpeed = Math.max(1, effSpeed - 2); // Vehicles: -2 speed in forest
              }
            }
          }
        }

        const moveAmount = effSpeed * deltaTime * GAME_CONFIG.unitSpeedMultiplier;

        let sepX = 0, sepZ = 0;
        if (this.game && this.game.spatialGrid) {
          const sepR = FORMATION_CONFIG.separationRadius;
          const sepR2 = sepR * sepR;
          const nearby = this.game.spatialGrid.query(pos.x, pos.z, sepR);
          for (let ni = 0, nlen = nearby.length; ni < nlen; ni++) {
            const other = nearby[ni];
            if (other === this || !other.isUnit || other.team !== this.team || !other.alive) continue;
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

        // GD-078: Forest cover visual indicator
        if (this.domain === 'land' && this.game && this.game.terrain && this.game.terrain.isInForest) {
          const inForest = this.game.terrain.isInForest(pos.x, pos.z);
          if (inForest !== this._wasInForest) {
            this._wasInForest = inForest;
            if (inForest) {
              // Subtle green tint
              this.mesh.traverse(child => {
                if (child.isMesh && child.material && !child.material._forestTinted) {
                  child.material._forestTinted = true;
                  child.material._preForestColor = child.material.color.getHex();
                  const c = child.material.color;
                  c.setRGB(
                    c.r * 0.8,
                    Math.min(1, c.g * 1.15 + 0.05),
                    c.b * 0.8
                  );
                }
              });
            } else {
              // Restore original color
              this.mesh.traverse(child => {
                if (child.isMesh && child.material && child.material._forestTinted) {
                  child.material.color.setHex(child.material._preForestColor);
                  delete child.material._forestTinted;
                  delete child.material._preForestColor;
                }
              });
            }
          }
        }

        // GD-065: Tank dust while moving
        if (this.type === 'tank' && this.game && this.game.effectsManager) {
          this._dustTimer = (this._dustTimer || 0) + deltaTime;
          if (this._dustTimer > 0.3) {
            this._dustTimer = 0;
            this.game.effectsManager.createDustPuff(pos.clone());
          }
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

          // Patrol: cycle to next patrol point
          if (this._isPatrolling && this._patrolPoints.length >= 2) {
            this._patrolIndex = (this._patrolIndex + 1) % this._patrolPoints.length;
            this.moveTarget = this._patrolPoints[this._patrolIndex].clone();
            this.isMoving = true;
            this._attackMove = true; // patrol engages enemies
          }
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
        // Defensive stance: don't chase beyond auto-acquire range
        if (this.stance === 'defensive') {
          this.attackTarget = null;
        } else {
          // Out of range - chase the target (don't clear attackTarget)
          this.chasePosition(this.attackTarget.getPosition());
        }
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

  // ===== GD-108: Procedural Animations =====
  updateProceduralAnimation(dt) {
    const t = this._animTime;

    if (this.domain === 'land' && this.type === 'infantry') {
      if (this._hasGLBModel) {
        // GLB model: simple bob animation only (no child-index-based leg/arm swing)
        if (this.isMoving) {
          const bobFreq = 8;
          const bobAmp = 0.1;
          // Find the model group (first child that isn't selection ring or health bar)
          const modelChild = this.mesh.children[0];
          if (modelChild && !modelChild.geometry) {
            // Subtle Y bob on the model sub-group
            modelChild.position.y = (modelChild._baseY || modelChild.position.y) + Math.sin(t * bobFreq) * bobAmp;
            if (modelChild._baseY === undefined) modelChild._baseY = modelChild.position.y;
          }
        }
        if (this._recoilTimer > 0) {
          this._recoilTimer -= dt;
        }
      } else {
        // Procedural mesh: detailed child-index-based animation
        // Walking bob and leg oscillation
        if (this.isMoving) {
          const bobFreq = 8;
          const bobAmp = 0.15;
          // Whole group Y bob
          this.mesh.position.y += Math.sin(t * bobFreq) * bobAmp * 0.3;

          // Leg swing (children 0,1 = left/right leg in Infantry mesh)
          const legSwing = Math.sin(t * bobFreq) * 0.4;
          if (this.mesh.children[0]) this.mesh.children[0].rotation.x = legSwing;
          if (this.mesh.children[1]) this.mesh.children[1].rotation.x = -legSwing;

          // Arm swing (children ~10,11)
          const armChild1 = this.mesh.children[10];
          const armChild2 = this.mesh.children[11];
          if (armChild1 && armChild1.geometry?.type === 'BoxGeometry') {
            armChild1.rotation.x = -legSwing * 0.5;
          }
          if (armChild2 && armChild2.geometry?.type === 'BoxGeometry') {
            armChild2.rotation.x = legSwing * 0.3;
          }
        } else {
          // Return to idle
          if (this.mesh.children[0]) this.mesh.children[0].rotation.x *= 0.9;
          if (this.mesh.children[1]) this.mesh.children[1].rotation.x *= 0.9;
        }

        // Weapon recoil on attack
        if (this._recoilTimer > 0) {
          this._recoilTimer -= dt;
          const recoil = Math.max(0, this._recoilTimer) * 2;
          // Push gun backward slightly (gun is typically child ~14-16)
          for (let i = 14; i < Math.min(this.mesh.children.length, 20); i++) {
            const c = this.mesh.children[i];
            if (c && c.geometry) {
              c.position.z = (c._origZ || c.position.z) - recoil * 0.3;
              if (!c._origZ) c._origZ = c.position.z + recoil * 0.3;
            }
          }
        }
      }
    }

    // Tank animations
    if (this.type === 'tank' || this.type === 'heavytank') {
      // Body rumble when moving
      if (this.isMoving) {
        this.mesh.rotation.z = Math.sin(t * 12) * 0.008;
        this.mesh.rotation.x = Math.sin(t * 8) * 0.005;
      } else {
        this.mesh.rotation.z *= 0.95;
        this.mesh.rotation.x *= 0.95;
      }

      // Barrel recoil
      if (this._recoilTimer > 0) {
        this._recoilTimer -= dt;
      }
    }

    // Plane/drone banking during turns
    if (this.domain === 'air') {
      // Slight pitch variation (bob)
      const airBob = Math.sin(t * 1.5) * 0.3;
      this.mesh.position.y = this.flyHeight + airBob;

      // Bank into turns
      if (this._lastRotY !== undefined) {
        const rotDiff = this.mesh.rotation.y - this._lastRotY;
        this._bankTarget = Math.max(-0.3, Math.min(0.3, rotDiff * 5));
      }
      this._bankCurrent = (this._bankCurrent || 0) * 0.95 + (this._bankTarget || 0) * 0.05;
      this.mesh.rotation.z = this._bankCurrent;
      this._lastRotY = this.mesh.rotation.y;
    }

    // Ship bob and roll
    if (this.domain === 'naval') {
      const bobAmp = 0.3;
      const rollAmp = 0.02;
      this.mesh.position.y = Math.sin(t * 1.2) * bobAmp;
      this.mesh.rotation.z = Math.sin(t * 0.8) * rollAmp;
      this.mesh.rotation.x = Math.sin(t * 0.6 + 1) * rollAmp * 0.5;
    }
  }

  /** Trigger weapon recoil animation */
  triggerRecoil() {
    this._recoilTimer = 0.15;
  }

  // ===== GD-105: Faction Passive Updates =====
  updateFactionPassives(dt) {
    // Ranger camo: invisible when stationary for 3s
    if (this.factionPassive && this.factionPassive.camoDelay !== undefined) {
      if (!this.isMoving && !this.attackTarget) {
        this._camoTimer = (this._camoTimer || 0) + dt;
        if (this._camoTimer >= this.factionPassive.camoDelay && !this._isCamoed) {
          this._isCamoed = true;
          // Make semi-transparent
          this.mesh.traverse(child => {
            if (child.isMesh && child.material) {
              child.material.transparent = true;
              child.material.opacity = 0.3;
            }
          });
        }
      } else {
        if (this._isCamoed) {
          this._isCamoed = false;
          this.mesh.traverse(child => {
            if (child.isMesh && child.material) {
              child.material.opacity = 1.0;
            }
          });
        }
        this._camoTimer = 0;
      }
    }

    // Banzai charge timer
    if (this._banzaiTimer > 0) {
      this._banzaiTimer -= dt;
      if (this._banzaiTimer <= 0) {
        // Banzai ends: revert stats, lose 50% HP
        this.speed = this.baseSpeed;
        this.damage = this.baseDamage;
        this.health = Math.max(1, Math.floor(this.health * 0.5));
        this._banzaiActive = false;
      }
    }

    // Churchill aura: apply armor buff to nearby vehicles
    if (this.factionAura && this.factionAura.type === 'armor' && this.game) {
      this._auraTimer = (this._auraTimer || 0) + dt;
      if (this._auraTimer >= 2.0) { // Check every 2s
        this._auraTimer = 0;
        const radius = this.factionAura.radius;
        const bonus = this.factionAura.bonus;
        const allies = this.game.getUnits(this.team);
        for (const ally of allies) {
          if (ally === this || !ally.alive || ally.domain !== 'land') continue;
          if (this.distanceTo(ally) <= radius * 3) {
            if (!ally._churchillArmor) {
              ally._churchillArmor = true;
              const armorBoost = Math.round(ally.baseArmor * bonus);
              ally.armor = ally.baseArmor + Math.max(1, armorBoost);
            }
          } else if (ally._churchillArmor) {
            ally._churchillArmor = false;
            ally.armor = ally.baseArmor;
          }
        }
      }
    }
  }

  /** Activate banzai charge (Imperial Marine) */
  activateBanzai() {
    if (this._banzaiActive) return;
    const ab = this.ability;
    if (!ab || ab.id !== 'banzai') return;
    this._banzaiActive = true;
    this._banzaiTimer = ab.duration;
    this.speed = this.baseSpeed * ab.speedMult;
    this.damage = this.baseDamage * ab.damageMult;
    this.abilityCooldown = ab.cooldown;
  }

  canAttack() {
    if (this.empDisabledTimer > 0) return false;
    return this.attackCooldown <= 0;
  }

  isInRange(target) {
    return this.distanceTo(target) <= this.range * 3;
  }
}
