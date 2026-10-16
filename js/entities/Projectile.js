import * as THREE from 'three';
import { projectileMeshPool } from '../core/ObjectPool.js';

// Shared geometry/material — individual projectiles use the pool
const _sharedGeo = new THREE.SphereGeometry(0.2, 4, 4);
const _sharedMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

// Trail type color/scale lookup
const TRAIL_CONFIG = {
  bullet:    { color: 0xffe7ab, scale: 0.15 },
  shell:     { color: 0xffbd6b, scale: 0.3 },
  laser:     { color: 0x8be1ec, scale: 0.2 },
  artillery: { color: 0xff4400, scale: 0.4 },
  torpedo:   { color: 0xaaddff, scale: 0.25 }
};

// Determine trail type from source unit type
function _resolveTrailType(source) {
  if (!source || !source.type) return 'bullet';
  switch (source.type) {
    case 'infantry': case 'scoutcar': case 'apc': case 'aahalftrack':
      return 'bullet';
    case 'tank': case 'heavytank': case 'turret': case 'battleship':
      return 'shell';
    case 'drone': case 'plane':
      return 'laser';
    case 'bomber': case 'spg': case 'mortar':
      return 'artillery';
    case 'submarine': case 'patrolboat':
      return 'torpedo';
    default:
      return 'bullet';
  }
}

export class Projectile {
  constructor(source, target, damage, speed = 80) {
    this.source = source;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.alive = true;

    // Determine trail type from source
    this.trailType = _resolveTrailType(source);
    const cfg = TRAIL_CONFIG[this.trailType] || TRAIL_CONFIG.bullet;

    const start = source.getPosition().clone();
    start.y += 2; // Fire from unit height
    this.startPos = start;

    const end = target.getPosition().clone();
    end.y += 1;
    if (this.trailType === 'torpedo') start.y = end.y = -.18;
    this.endPos = end;

    // Use pooled mesh when available, fall back to new mesh
    this.mesh = projectileMeshPool.acquire();
    this.mesh.position.copy(start);
    this._pooled = true;

    // Apply trail-type color and scale
    this.mesh.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.color.setHex(cfg.color);
      }
    });
    this.mesh.scale.set(cfg.scale / 0.2, cfg.scale / 0.2, cfg.scale / 0.2);

    this.direction = new THREE.Vector3().subVectors(end, start).normalize();
    this.distanceTotal = start.distanceTo(end);
    this.distanceTraveled = 0;

    // Trail points for trail rendering (last 8 positions)
    this.trailPoints = [start.clone()];
  }

  update(deltaTime) {
    if (!this.alive) return;

    const moveAmount = Math.min(this.speed * deltaTime, Math.max(0, this.distanceTotal - this.distanceTraveled));
    this.distanceTraveled += moveAmount;
    const progress = this.distanceTotal > 0 ? Math.min(1, this.distanceTraveled / this.distanceTotal) : 1;
    this.mesh.position.lerpVectors(this.startPos, this.endPos, progress);
    if (this.trailType === 'artillery') this.mesh.position.y += Math.sin(progress * Math.PI) * Math.min(8, this.distanceTotal * .18);

    // Store trail points (max 8)
    this.trailPoints.push(this.mesh.position.clone());
    if (this.trailPoints.length > 8) this.trailPoints.shift();

    // Check if reached target
    if (this.distanceTraveled >= this.distanceTotal) {
      this.alive = false;
      this.onImpact?.(this.endPos);
      this.onImpact = null;
      // Visual arrival only; CombatSystem retains its existing damage timing.
    }
  }

  /**
   * Return pooled mesh. Called by Game.removeProjectile.
   */
  dispose() {
    if (this._pooled && this.mesh) {
      // Reset scale and color before returning to pool
      this.mesh.scale.set(1, 1, 1);
      this.mesh.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.color.setHex(0xffff00);
        }
      });
      projectileMeshPool.release(this.mesh);
      this.mesh = null;
    }
  }
}
