import * as THREE from 'three';
import { Entity } from './Entity.js';
import { UNIT_STATS, GAME_CONFIG } from '../core/Constants.js';

export class Unit extends Entity {
  constructor(type, team, position, stats) {
    super(type, team, position);
    this.isUnit = true;

    const s = stats || UNIT_STATS[type];
    this.speed = s.speed;
    this.damage = s.damage;
    this.range = s.range;
    this.domain = s.domain;
    this.health = s.hp;
    this.maxHealth = s.hp;
    this.cost = s.cost;
    this.armor = s.armor || 0;
    this.vision = s.vision || 10;
    this.attackRate = s.attackRate || 1.0; // attacks per second from stats

    this.moveTarget = null;
    this.attackTarget = null;
    this.attackCooldown = 0;
    this.isMoving = false;

    // Waypoint queue for pathfinding
    this.waypoints = [];
    this._attackMove = false;

    // Game reference (set by Game.createUnit)
    this.game = null;

    // For air units, float height
    this.flyHeight = this.domain === 'air' ? 15 : 0;
  }

  // Move to position (clears attack target - explicit move command)
  moveTo(target) {
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
    this.moveTarget = target.clone();
    if (this.domain !== 'air') {
      this.moveTarget.y = 0;
    }
    this.isMoving = true;
    // Do NOT clear attackTarget - this is a chase move
  }

  attackEntity(target) {
    this.attackTarget = target;
  }

  stop() {
    this.moveTarget = null;
    this.attackTarget = null;
    this.isMoving = false;
    this.waypoints = [];
    this._attackMove = false;
  }

  update(deltaTime) {
    if (!this.alive || !this.mesh) return;

    // Tick attack cooldown (CombatSystem sets cooldown, we just count down)
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }

    // Movement
    if (this.moveTarget) {
      const pos = this.mesh.position;
      const dx = this.moveTarget.x - pos.x;
      const dz = this.moveTarget.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 1) {
        const moveAmount = this.speed * deltaTime * GAME_CONFIG.unitSpeedMultiplier;
        const ratio = Math.min(moveAmount / dist, 1);
        pos.x += dx * ratio;
        pos.z += dz * ratio;

        // Face movement direction
        this.mesh.rotation.y = Math.atan2(dx, dz);
        this.isMoving = true;

        // Update Y position from terrain for land units
        if (this.domain === 'land' && this.game && this.game.terrain) {
          pos.y = this.game.terrain.getHeightAt(pos.x, pos.z);
        }
      } else {
        // Reached current waypoint
        if (this.waypoints.length > 0) {
          // Move to next waypoint
          this.moveTarget = this.waypoints.shift();
          if (this.domain !== 'air') {
            this.moveTarget.y = 0;
          }
        } else {
          this.moveTarget = null;
          this.isMoving = false;
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
        this.mesh.rotation.y = Math.atan2(fdx, fdz);
      }
    }
  }

  canAttack() {
    return this.attackCooldown <= 0;
  }

  isInRange(target) {
    return this.distanceTo(target) <= this.range * 3;
  }
}
