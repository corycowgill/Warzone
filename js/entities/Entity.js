import * as THREE from 'three';

export class Entity {
  static nextId = 1;

  constructor(type, team, position) {
    this.id = Entity.nextId++;
    this.type = type;
    this.team = team;
    this.position = position.clone();
    this.health = 100;
    this.maxHealth = 100;
    this.alive = true;
    this.selected = false;
    this.mesh = null;
    this.selectionRing = null;
    this.healthBar = null;
    this.isUnit = false;
    this.isBuilding = false;
  }

  setSelected(selected) {
    this.selected = selected;
    if (this.selectionRing) {
      this.selectionRing.visible = selected;
    }
  }

  createSelectionRing(radius) {
    const ringGeometry = new THREE.RingGeometry(radius - 0.2, radius, 32);
    ringGeometry.rotateX(-Math.PI / 2);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: this.team === 'player' ? 0x00ff00 : 0xff0000,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    this.selectionRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.selectionRing.position.y = 0.2;
    this.selectionRing.visible = false;
    if (this.mesh) this.mesh.add(this.selectionRing);
  }

  createHealthBar() {
    const barGroup = new THREE.Group();

    // Background (red)
    const bgGeometry = new THREE.PlaneGeometry(3, 0.3);
    const bgMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    const bg = new THREE.Mesh(bgGeometry, bgMaterial);
    barGroup.add(bg);

    // Foreground (green)
    const fgGeometry = new THREE.PlaneGeometry(3, 0.3);
    const fgMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    const fg = new THREE.Mesh(fgGeometry, fgMaterial);
    fg.name = 'healthFill';
    barGroup.add(fg);

    barGroup.position.y = 5; // Float above entity
    barGroup.lookAt(new THREE.Vector3(barGroup.position.x, barGroup.position.y, barGroup.position.z + 1));

    this.healthBar = barGroup;
    if (this.mesh) this.mesh.add(barGroup);
    return barGroup;
  }

  updateHealthBar(camera) {
    if (!this.healthBar) return;

    const ratio = this.health / this.maxHealth;
    const fill = this.healthBar.getObjectByName('healthFill');
    if (fill) {
      fill.scale.x = ratio;
      fill.position.x = -(1 - ratio) * 1.5;
      fill.material.color.setHex(ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffaa00 : 0xff0000);
    }

    // Billboard - face camera
    if (camera) {
      this.healthBar.quaternion.copy(camera.quaternion);
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }

    // Flash red/white on hit for 100ms
    if (this.mesh && !this._flashing) {
      this._flashing = true;
      const savedMaterials = [];

      const healthBarGroup = this.healthBar;
      this.mesh.traverse(child => {
        if (child.isMesh && child !== this.selectionRing &&
            !(healthBarGroup && child.parent === healthBarGroup)) {
          savedMaterials.push({ mesh: child, material: child.material });
          child.material = new THREE.MeshBasicMaterial({
            color: this.alive ? 0xff3333 : 0xffffff,
            transparent: child.material.transparent,
            opacity: child.material.opacity
          });
        }
      });

      setTimeout(() => {
        for (const entry of savedMaterials) {
          // Dispose temporary flash material
          if (entry.mesh.material && entry.mesh.material !== entry.material) {
            entry.mesh.material.dispose();
          }
          entry.mesh.material = entry.material;
        }
        this._flashing = false;
      }, 100);
    }
  }

  getPosition() {
    return this.mesh ? this.mesh.position : this.position;
  }

  distanceTo(other) {
    const pos1 = this.getPosition();
    const pos2 = other.getPosition();
    return pos1.distanceTo(pos2);
  }

  update(deltaTime) {
    // Override in subclasses
  }

  destroy() {
    this.alive = false;
  }
}
