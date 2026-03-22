import * as THREE from 'three';

export class Projectile {
  constructor(source, target, damage, speed = 80) {
    this.source = source;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.alive = true;

    const start = source.getPosition().clone();
    start.y += 2; // Fire from unit height
    this.startPos = start;

    const end = target.getPosition().clone();
    end.y += 1;
    this.endPos = end;

    // Create mesh - small glowing sphere
    const geometry = new THREE.SphereGeometry(0.2, 4, 4);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(start);

    this.direction = new THREE.Vector3().subVectors(end, start).normalize();
    this.distanceTotal = start.distanceTo(end);
    this.distanceTraveled = 0;
  }

  update(deltaTime) {
    if (!this.alive) return;

    const moveAmount = this.speed * deltaTime;
    this.mesh.position.addScaledVector(this.direction, moveAmount);
    this.distanceTraveled += moveAmount;

    // Check if reached target
    if (this.distanceTraveled >= this.distanceTotal) {
      this.alive = false;
      // Damage is applied by CombatSystem when projectile dies
    }
  }
}
