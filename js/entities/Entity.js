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
    const ringGeometry = new THREE.RingGeometry(radius - 0.15, radius, 32);
    ringGeometry.rotateX(-Math.PI / 2);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: this.team === 'player' ? 0x44ff44 : 0xff4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    this.selectionRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.selectionRing.position.y = 0.2;
    this.selectionRing.visible = false;
    if (this.mesh) this.mesh.add(this.selectionRing);
  }

  createHealthBar() {
    const barGroup = new THREE.Group();

    // Standardized bar size: 2.5 wide, 0.25 tall (consistent across all entities)
    const barWidth = 2.5;
    const barHeight = 0.25;

    // Background (dark gray, not red - reduces visual noise)
    const bgGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
    const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const bg = new THREE.Mesh(bgGeometry, bgMaterial);
    barGroup.add(bg);

    // Foreground (green fill)
    const fgGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
    const fgMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    const fg = new THREE.Mesh(fgGeometry, fgMaterial);
    fg.name = 'healthFill';
    barGroup.add(fg);

    // Thin black border frame
    const borderGeo = new THREE.PlaneGeometry(barWidth + 0.15, barHeight + 0.1);
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.z = -0.01; // Behind the bars
    barGroup.add(border);

    // Position above entity - calculate from mesh bounding box if possible
    let barY = 4;
    if (this.mesh) {
      try {
        const box = new THREE.Box3().setFromObject(this.mesh);
        const meshHeight = box.max.y - box.min.y;
        barY = Math.max(meshHeight + 1.0, 2.5); // At least 1 unit above mesh top
      } catch (e) {
        barY = 4;
      }
    }
    barGroup.position.y = barY;

    this.healthBar = barGroup;
    if (this.mesh) this.mesh.add(barGroup);

    // Auto-create type label for units after health bar is ready
    if (this.isUnit) {
      this.createTypeLabel();
    }

    return barGroup;
  }

  createTypeLabel() {
    if (!this.isUnit || !this.mesh) return;

    // Create canvas-based text sprite showing unit type name
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);

    // Format type name: capitalize first letter
    const label = this.type.charAt(0).toUpperCase() + this.type.slice(1);

    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Shadow for readability
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(label, 129, 33);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.5, 0.625, 1);

    // Position below health bar
    let labelY = 3;
    if (this.healthBar) {
      labelY = this.healthBar.position.y - 0.6;
    }
    sprite.position.y = labelY;
    sprite.visible = false;

    this._typeLabel = sprite;
    this.mesh.add(sprite);
  }

  updateHealthBar(camera) {
    if (!this.healthBar) return;

    // Performance: skip health bar updates for entities far from camera (off-screen likely)
    if (camera && this.mesh) {
      const dx = this.mesh.position.x - camera.position.x;
      const dz = this.mesh.position.z - camera.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq > 22500) { // > 150 units away
        this.healthBar.visible = false;
        if (this._typeLabel) this._typeLabel.visible = false;
        return;
      }
      this.healthBar.visible = true;

      // Show type label only when camera is close (< 40 units)
      if (this._typeLabel) {
        this._typeLabel.visible = distSq < 1600; // 40^2 = 1600
      }
    }

    const ratio = this.health / this.maxHealth;
    // Performance: cache the fill mesh reference instead of getObjectByName every frame
    if (!this._healthFill) {
      this._healthFill = this.healthBar.getObjectByName('healthFill');
    }
    const fill = this._healthFill;
    if (fill) {
      fill.scale.x = ratio;
      fill.position.x = -(1 - ratio) * 1.5;
      fill.material.color.setHex(ratio > 0.6 ? 0x00ff00 : ratio > 0.3 ? 0xffaa00 : 0xff0000);
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

    // Flash red/white on hit for 100ms — use emissive color instead of creating new materials
    if (this.mesh && !this._flashing) {
      this._flashing = true;
      const flashColor = this.alive ? 0xff3333 : 0xffffff;

      // Cache mesh children list on first use to avoid traverse() overhead
      if (!this._meshChildren) {
        this._meshChildren = [];
        const healthBarGroup = this.healthBar;
        this.mesh.traverse(child => {
          if (child.isMesh && child !== this.selectionRing &&
              !(healthBarGroup && child.parent === healthBarGroup) &&
              child.material && child.material.emissive) {
            this._meshChildren.push(child);
          }
        });
      }

      for (let i = 0, len = this._meshChildren.length; i < len; i++) {
        const child = this._meshChildren[i];
        if (child.material && child.material.emissive) {
          child.material.emissive.setHex(flashColor);
        }
      }

      setTimeout(() => {
        for (let i = 0, len = this._meshChildren.length; i < len; i++) {
          const child = this._meshChildren[i];
          if (child.material && child.material.emissive) {
            child.material.emissive.setHex(0x000000);
          }
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
    // Dispose type label resources
    if (this._typeLabel) {
      if (this._typeLabel.material) {
        if (this._typeLabel.material.map) this._typeLabel.material.map.dispose();
        this._typeLabel.material.dispose();
      }
      if (this.mesh) this.mesh.remove(this._typeLabel);
      this._typeLabel = null;
    }
  }
}
