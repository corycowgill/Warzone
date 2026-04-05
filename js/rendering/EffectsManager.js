import * as THREE from 'three';

export class EffectsManager {
  constructor(game) {
    this.game = game;
    this.scene = game.sceneManager.scene;
    this.activeEffects = [];

    // GD-129: Pre-create billboard textures for particle pooling
    this._fireTexture = this._createGradientTexture(0xff6600, 0xffcc00);
    this._smokeTexture = this._createGradientTexture(0x444444, 0x888888);
    this._sparkTexture = this._createGradientTexture(0xffffaa, 0xffffff);

    // GD-129: Particle pool
    this._spritePool = [];
    this._poolSize = 200;
    for (let i = 0; i < this._poolSize; i++) {
      const mat = new THREE.SpriteMaterial({ transparent: true, opacity: 1, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this._spritePool.push(sprite);
    }
  }

  // GD-129: Create gradient circle texture via canvas
  _createGradientTexture(innerColor, outerColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    const ic = new THREE.Color(innerColor);
    const oc = new THREE.Color(outerColor);
    grad.addColorStop(0, `rgba(${Math.round(ic.r*255)},${Math.round(ic.g*255)},${Math.round(ic.b*255)},1)`);
    grad.addColorStop(0.5, `rgba(${Math.round(oc.r*255)},${Math.round(oc.g*255)},${Math.round(oc.b*255)},0.6)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // GD-129: Get a sprite from pool (or create one, up to max 500)
  _getPooledSprite(texture, color, size) {
    let sprite = this._spritePool.find(s => !s.visible);
    if (!sprite) {
      if (this._spritePool.length >= 500) {
        // Pool at max capacity - reuse oldest visible sprite
        sprite = this._spritePool[0];
        if (sprite.parent) sprite.parent.remove(sprite);
      } else {
        const mat = new THREE.SpriteMaterial({ transparent: true, opacity: 1, depthWrite: false });
        sprite = new THREE.Sprite(mat);
        this._spritePool.push(sprite);
      }
    }
    sprite.material.map = texture;
    sprite.material.color.set(color || 0xffffff);
    sprite.material.opacity = 1;
    sprite.material.needsUpdate = true;
    sprite.scale.set(size, size, 1);
    sprite.visible = true;
    return sprite;
  }

  // GD-129: Return sprite to pool
  _returnToPool(sprite) {
    sprite.visible = false;
    if (sprite.parent) sprite.parent.remove(sprite);
  }

  // GD-133: Create shadow texture (dark ellipse with soft edges)
  _createShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(0,0,0,0.35)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(32, 32, 30, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
  }

  // GD-133: Add shadow under an entity
  createEntityShadow(entity) {
    if (!entity.mesh || entity._shadow) return;

    if (!this._shadowTexture) {
      this._shadowTexture = this._createShadowTexture();
    }

    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: this._shadowTexture,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(geo, mat);
    shadow.rotation.x = -Math.PI / 2;

    // Scale based on unit type
    let size = 3;
    if (entity.isUnit) {
      if (entity.type === 'infantry' || entity.type === 'engineer' || entity.type === 'mortar') size = 2;
      else if (entity.type === 'tank' || entity.type === 'aahalftrack' || entity.type === 'apc' || entity.type === 'scoutcar') size = 3.5;
      else if (entity.type === 'heavytank' || entity.type === 'spg' || entity.type === 'commander') size = 4;
      else if (entity.type === 'battleship' || entity.type === 'carrier') size = 6;
      else if (entity.type === 'submarine' || entity.type === 'patrolboat') size = 3;
      else if (entity.domain === 'air') size = 3;
    } else if (entity.isBuilding) {
      const bs = entity.size || 2;
      size = bs * 3;
    }
    shadow.scale.set(size, size, 1);

    entity._shadow = shadow;
    entity._shadowSize = size;
    this.scene.add(shadow);
  }

  // GD-133: Update all entity shadows
  updateShadows(entities) {
    for (const entity of entities) {
      if (!entity.alive) {
        if (entity._shadow) {
          this.scene.remove(entity._shadow);
          entity._shadow.geometry.dispose();
          entity._shadow.material.dispose();
          entity._shadow = null;
        }
        continue;
      }

      if (!entity._shadow) {
        this.createEntityShadow(entity);
      }

      if (entity._shadow && entity.mesh) {
        const pos = entity.mesh.position;
        // Shadow on ground below entity
        let groundY = 0;
        if (this.game.terrain) {
          groundY = this.game.terrain.getHeightAt(pos.x, pos.z);
        }
        entity._shadow.position.set(pos.x, groundY + 0.15, pos.z);

        // Air units: offset shadow slightly based on sun direction
        if (entity.isUnit && entity.domain === 'air') {
          entity._shadow.position.x += 2;
          entity._shadow.position.z += 2;
        }
      }
    }
  }

  createExplosion(position) {
    // GD-129: Billboard sprite explosion with fire + smoke
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    // Fire particles (20-30 orange/red billboards)
    const fireCount = 20 + Math.floor(Math.random() * 10);
    for (let i = 0; i < fireCount; i++) {
      const size = 1.0 + Math.random() * 1.5;
      const sprite = this._getPooledSprite(this._fireTexture, Math.random() > 0.4 ? 0xff6600 : 0xffcc00, size);
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI;
      const speed = 5 + Math.random() * 10;
      sprite.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 5,
        Math.sin(angle) * Math.cos(elevation) * speed
      );
      sprite.userData.isPooled = true;
      group.add(sprite);
      particles.push(sprite);
    }

    // Darker smoke particles that rise slowly
    const smokeCount = 8;
    for (let i = 0; i < smokeCount; i++) {
      const size = 1.5 + Math.random() * 2;
      const sprite = this._getPooledSprite(this._smokeTexture, 0x333333, size);
      sprite.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        2 + Math.random() * 3,
        (Math.random() - 0.5) * 3
      );
      sprite.userData.isPooled = true;
      sprite.userData.isSmoke = true;
      group.add(sprite);
      particles.push(sprite);
    }

    this.scene.add(group);

    this.activeEffects.push({
      type: 'explosion',
      group: group,
      particles: particles,
      lifetime: 0.8,
      elapsed: 0
    });

    // GD-129: Ground scorch mark
    this.createScorchMark(position);
  }

  createMuzzleFlash(position) {
    // GD-129: Billboard sprite muzzle flash
    const group = new THREE.Group();
    group.position.copy(position);
    group.position.y += 2;

    const flash = this._getPooledSprite(this._sparkTexture, 0xffffaa, 1.5);
    flash.userData.isPooled = true;
    group.add(flash);

    const light = new THREE.PointLight(0xffaa44, 3, 15);
    group.add(light);

    this.scene.add(group);

    this.activeEffects.push({
      type: 'muzzleFlash',
      group: group,
      flash: flash,
      light: light,
      lifetime: 0.1,
      elapsed: 0
    });
  }

  // GD-129: Bullet impact sparks
  createBulletImpact(position) {
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    for (let i = 0; i < 5; i++) {
      const sprite = this._getPooledSprite(this._sparkTexture, 0xffee88, 0.3 + Math.random() * 0.3);
      sprite.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 5 + 2,
        (Math.random() - 0.5) * 8
      );
      sprite.userData.isPooled = true;
      group.add(sprite);
      particles.push(sprite);
    }

    this.scene.add(group);
    this.activeEffects.push({
      type: 'explosion',
      group,
      particles,
      lifetime: 0.3,
      elapsed: 0
    });
  }

  // GD-129: Ground scorch mark at explosion site
  createScorchMark(position) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(20,15,10,0.6)');
    grad.addColorStop(0.7, 'rgba(30,25,15,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(6, 6);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.copy(position);
    plane.position.y += 0.1;

    this.scene.add(plane);

    this.activeEffects.push({
      type: 'scorch',
      group: plane,
      material: mat,
      texture: texture,
      geometry: geo,
      lifetime: 10,
      elapsed: 0
    });
  }

  createHealthBar(entity) {
    const barGroup = new THREE.Group();

    // Background (red)
    const bgGeometry = new THREE.PlaneGeometry(3, 0.3);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide
    });
    const bg = new THREE.Mesh(bgGeometry, bgMaterial);
    barGroup.add(bg);

    // Foreground (green)
    const fgGeometry = new THREE.PlaneGeometry(3, 0.3);
    const fgMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide
    });
    const fg = new THREE.Mesh(fgGeometry, fgMaterial);
    fg.name = 'healthFill';
    barGroup.add(fg);

    barGroup.position.y = entity.isBuilding ? 8 : 5;

    if (entity.mesh) {
      entity.mesh.add(barGroup);
    }
    entity.healthBar = barGroup;
    return barGroup;
  }

  updateHealthBar(entity, camera) {
    if (!entity.healthBar) return;

    const ratio = entity.health / entity.maxHealth;
    const fill = entity.healthBar.getObjectByName('healthFill');
    if (fill) {
      fill.scale.x = Math.max(ratio, 0.001);
      fill.position.x = -(1 - ratio) * 1.5;

      if (ratio > 0.5) {
        fill.material.color.setHex(0x00ff00);
      } else if (ratio > 0.25) {
        fill.material.color.setHex(0xffaa00);
      } else {
        fill.material.color.setHex(0xff0000);
      }
    }

    // Billboard - face camera
    if (camera) {
      entity.healthBar.quaternion.copy(camera.quaternion);
    }
  }

  createDamageNumber(position, damage, effectiveness) {
    // effectiveness: 'high' (red), 'normal' (white), 'low' (grey)
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const dmgText = Math.round(damage).toString();
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Color by effectiveness
    let fillColor;
    if (effectiveness === 'high') {
      fillColor = '#ff3333';
    } else if (effectiveness === 'low') {
      fillColor = '#999999';
    } else {
      fillColor = '#ffffff';
    }

    // Draw text with black outline for readability
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(dmgText, 64, 32);
    ctx.fillStyle = fillColor;
    ctx.fillText(dmgText, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0,
      depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 1.5, 1);
    sprite.position.copy(position);
    sprite.position.y += 4;

    // Small random horizontal offset so overlapping numbers spread out
    sprite.position.x += (Math.random() - 0.5) * 1.5;
    sprite.position.z += (Math.random() - 0.5) * 1.5;

    this.scene.add(sprite);

    this.activeEffects.push({
      type: 'damageNumber',
      group: sprite,
      material: material,
      texture: texture,
      lifetime: 1.0,
      elapsed: 0,
      startY: sprite.position.y
    });
  }

  // GD-064: Gold salvage text
  createSalvageText(position, amount) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const text = `+${amount} SP`;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(text, 64, 32);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(text, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1.0, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3.5, 1.75, 1);
    sprite.position.copy(position);
    sprite.position.y += 5;
    this.scene.add(sprite);

    this.activeEffects.push({
      type: 'damageNumber',
      group: sprite,
      material,
      texture,
      lifetime: 1.5,
      elapsed: 0,
      startY: sprite.position.y
    });
  }

  // GD-065: Smoke particles lingering after explosions
  createSmoke(position) {
    const particleCount = 6;
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const size = 0.5 + Math.random() * 0.8;
      const geo = new THREE.SphereGeometry(size, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.6 });
      const p = new THREE.Mesh(geo, mat);
      p.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        1 + Math.random() * 2,
        (Math.random() - 0.5) * 2
      );
      group.add(p);
      particles.push(p);
    }

    this.scene.add(group);
    this.activeEffects.push({
      type: 'smoke',
      group,
      particles,
      lifetime: 2.5,
      elapsed: 0
    });
  }

  // GD-065: Projectile trail line (enhanced with trail types)
  createProjectileTrail(from, to, trailType) {
    trailType = trailType || 'bullet';
    const colorMap = {
      bullet: 0xffee44, shell: 0xff8800, laser: 0x00ff44,
      artillery: 0xff4400, torpedo: 0xaaddff
    };
    const color = colorMap[trailType] || 0xffcc44;

    const points = [from.clone(), to.clone()];
    points[0].y += 2;
    points[1].y += 2;
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: trailType === 'bullet' ? 1.0 : 0.8 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    this.activeEffects.push({
      type: 'trail',
      group: line,
      material: mat,
      geometry: geo,
      lifetime: trailType === 'laser' ? 0.1 : 0.2,
      elapsed: 0
    });

    // Extra smoke puffs for artillery/shell trails
    if (trailType === 'artillery' || trailType === 'shell') {
      const dir = new THREE.Vector3().subVectors(to, from);
      const puffCount = trailType === 'artillery' ? 4 : 3;
      for (let i = 0; i < puffCount; i++) {
        const t = (i + 1) / (puffCount + 1);
        const pos = from.clone().addScaledVector(dir, t);
        pos.y += 2 + Math.random();
        const sprite = this._getPooledSprite(this._smokeTexture, 0x777777, 0.5 + Math.random() * 0.4);
        sprite.position.copy(pos);
        sprite.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 1, 0.5 + Math.random(), (Math.random() - 0.5) * 1
        );
        sprite.userData.isPooled = true;
        this.scene.add(sprite);
        this.activeEffects.push({
          type: 'trailPuff',
          group: sprite,
          particles: [sprite],
          lifetime: 0.4,
          elapsed: 0
        });
      }
    }

    // Wake sprites for torpedo trails
    if (trailType === 'torpedo') {
      const dir = new THREE.Vector3().subVectors(to, from);
      for (let i = 0; i < 3; i++) {
        const t = (i + 1) / 4;
        const pos = from.clone().addScaledVector(dir, t);
        pos.y = 0.5;
        const sprite = this._getPooledSprite(this._sparkTexture, 0xccddff, 0.4);
        sprite.position.copy(pos);
        sprite.userData.velocity = new THREE.Vector3(0, 0.3, 0);
        sprite.userData.isPooled = true;
        this.scene.add(sprite);
        this.activeEffects.push({
          type: 'trailPuff',
          group: sprite,
          particles: [sprite],
          lifetime: 0.3,
          elapsed: 0
        });
      }
    }
  }

  // Impact effect at hit location based on projectile trail type
  createImpactEffect(position, impactType) {
    impactType = impactType || 'bullet';
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    if (impactType === 'bullet') {
      // 3 tiny yellow sparks + tiny dust puff
      for (let i = 0; i < 3; i++) {
        const sprite = this._getPooledSprite(this._sparkTexture, 0xffee44, 0.2 + Math.random() * 0.15);
        sprite.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 6, Math.random() * 4 + 1, (Math.random() - 0.5) * 6
        );
        sprite.userData.isPooled = true;
        group.add(sprite);
        particles.push(sprite);
      }
      // dust puff
      const dust = this._getPooledSprite(this._smokeTexture, 0xbbaa88, 0.4);
      dust.userData.velocity = new THREE.Vector3(0, 1, 0);
      dust.userData.isPooled = true;
      group.add(dust);
      particles.push(dust);
      this.scene.add(group);
      this.activeEffects.push({ type: 'explosion', group, particles, lifetime: 0.2, elapsed: 0 });

    } else if (impactType === 'shell') {
      // Small explosion: 5 fire sprites + dust cloud
      for (let i = 0; i < 5; i++) {
        const sprite = this._getPooledSprite(this._fireTexture, Math.random() > 0.5 ? 0xff6600 : 0xffaa00, 0.5 + Math.random() * 0.5);
        sprite.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 5, Math.random() * 4 + 2, (Math.random() - 0.5) * 5
        );
        sprite.userData.isPooled = true;
        group.add(sprite);
        particles.push(sprite);
      }
      const dust = this._getPooledSprite(this._smokeTexture, 0x998877, 0.8);
      dust.userData.velocity = new THREE.Vector3(0, 1.5, 0);
      dust.userData.isPooled = true;
      group.add(dust);
      particles.push(dust);
      this.scene.add(group);
      this.activeEffects.push({ type: 'explosion', group, particles, lifetime: 0.4, elapsed: 0 });

    } else if (impactType === 'artillery') {
      // Medium explosion: 10 fire + 5 dirt chunks + scorch mark
      for (let i = 0; i < 10; i++) {
        const sprite = this._getPooledSprite(this._fireTexture, Math.random() > 0.3 ? 0xff4400 : 0xffcc00, 0.6 + Math.random() * 0.8);
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 6;
        sprite.userData.velocity = new THREE.Vector3(
          Math.cos(angle) * speed, Math.random() * 5 + 3, Math.sin(angle) * speed
        );
        sprite.userData.isPooled = true;
        group.add(sprite);
        particles.push(sprite);
      }
      for (let i = 0; i < 5; i++) {
        const sprite = this._getPooledSprite(this._smokeTexture, 0x665533, 0.3 + Math.random() * 0.3);
        sprite.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 8, Math.random() * 6 + 2, (Math.random() - 0.5) * 8
        );
        sprite.userData.isPooled = true;
        group.add(sprite);
        particles.push(sprite);
      }
      this.scene.add(group);
      this.activeEffects.push({ type: 'explosion', group, particles, lifetime: 0.6, elapsed: 0 });
      this.createScorchMark(position);

    } else if (impactType === 'laser') {
      // Green flash sprite
      const flash = this._getPooledSprite(this._sparkTexture, 0x00ff44, 1.0);
      flash.userData.velocity = new THREE.Vector3(0, 0, 0);
      flash.userData.isPooled = true;
      group.add(flash);
      particles.push(flash);
      this.scene.add(group);
      this.activeEffects.push({ type: 'explosion', group, particles, lifetime: 0.15, elapsed: 0 });

    } else if (impactType === 'torpedo') {
      // Water splash: white sprites moving up then falling
      for (let i = 0; i < 6; i++) {
        const sprite = this._getPooledSprite(this._sparkTexture, 0xccddff, 0.4 + Math.random() * 0.3);
        const angle = Math.random() * Math.PI * 2;
        sprite.userData.velocity = new THREE.Vector3(
          Math.cos(angle) * 2, 4 + Math.random() * 3, Math.sin(angle) * 2
        );
        sprite.userData.isPooled = true;
        group.add(sprite);
        particles.push(sprite);
      }
      this.scene.add(group);
      this.activeEffects.push({ type: 'explosion', group, particles, lifetime: 0.5, elapsed: 0 });
    }
  }

  // Construction sparks: 2-3 small orange sparks at building position + random offset
  createConstructionSparks(position) {
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const sprite = this._getPooledSprite(this._sparkTexture, 0xff8800, 0.2 + Math.random() * 0.2);
      sprite.position.set(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4
      );
      sprite.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3
      );
      sprite.userData.isPooled = true;
      group.add(sprite);
      particles.push(sprite);
    }
    this.scene.add(group);
    this.activeEffects.push({ type: 'explosion', group, particles, lifetime: 0.4, elapsed: 0 });
  }

  // Dust puff on construction completion
  createConstructionDust(position) {
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const sprite = this._getPooledSprite(this._smokeTexture, 0xbbaa77, 0.6 + Math.random() * 0.5);
      sprite.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * 2, 1 + Math.random() * 1.5, Math.sin(angle) * 2
      );
      sprite.userData.isPooled = true;
      group.add(sprite);
      particles.push(sprite);
    }
    this.scene.add(group);
    this.activeEffects.push({ type: 'smoke', group, particles, lifetime: 0.8, elapsed: 0 });
  }

  // GD-065: Debris on building destruction
  createDebris(position) {
    const count = 8;
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    for (let i = 0; i < count; i++) {
      const size = 0.2 + Math.random() * 0.4;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshPhongMaterial({
        color: Math.random() > 0.5 ? 0x888888 : 0x664422,
        transparent: true,
        opacity: 1.0
      });
      const p = new THREE.Mesh(geo, mat);
      p.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        5 + Math.random() * 10,
        (Math.random() - 0.5) * 12
      );
      p.userData.rotSpeed = new THREE.Vector3(
        Math.random() * 5, Math.random() * 5, Math.random() * 5
      );
      group.add(p);
      particles.push(p);
    }

    this.scene.add(group);
    this.activeEffects.push({
      type: 'debris',
      group,
      particles,
      lifetime: 1.5,
      elapsed: 0
    });
  }

  // GD-065: Tank dust while moving
  createDustPuff(position) {
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    for (let i = 0; i < 3; i++) {
      const size = 0.3 + Math.random() * 0.3;
      const geo = new THREE.SphereGeometry(size, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xccaa77,
        transparent: true,
        opacity: 0.4
      });
      const p = new THREE.Mesh(geo, mat);
      p.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 1,
        0.5 + Math.random(),
        (Math.random() - 0.5) * 1
      );
      group.add(p);
      particles.push(p);
    }

    this.scene.add(group);
    this.activeEffects.push({
      type: 'smoke',
      group,
      particles,
      lifetime: 1.0,
      elapsed: 0
    });
  }

  // ============================
  // Cycle 15: Move Order Ground Markers
  // ============================
  createMoveMarker(position, type) {
    // type: 'move' (green) or 'attackmove' (red)
    const color = type === 'attackmove' ? 0xff3333 : 0x00ff44;

    // Pool management: reuse oldest if at max
    if (!this._moveMarkerPool) this._moveMarkerPool = [];
    if (this._moveMarkerPool.length >= 10) {
      const oldest = this._moveMarkerPool.shift();
      // Remove it from activeEffects
      const idx = this.activeEffects.indexOf(oldest);
      if (idx !== -1) {
        this.scene.remove(oldest.group);
        oldest.group.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        this.activeEffects.splice(idx, 1);
      }
    }

    const ringGeo = new THREE.RingGeometry(1.2, 1.6, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;

    // Get terrain height
    let y = 0.2;
    if (this.game.terrain) {
      y = this.game.terrain.getHeightAt(position.x, position.z) + 0.2;
    }
    ring.position.set(position.x, y, position.z);

    this.scene.add(ring);

    const effect = {
      type: 'moveMarker',
      group: ring,
      material: ringMat,
      geometry: ringGeo,
      lifetime: 1.0,
      elapsed: 0
    };

    this.activeEffects.push(effect);
    this._moveMarkerPool.push(effect);
  }

  // Spec 009: Dedicated fire effect for critically damaged buildings
  // Orange/red flickering particles that rise slowly and fade (0.5-1s lifetime)
  createFireEffect(position) {
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    const count = 5 + Math.floor(Math.random() * 4); // 5-8 particles
    for (let i = 0; i < count; i++) {
      const color = Math.random() > 0.5 ? 0xff4400 : 0xff6600;
      const size = 0.4 + Math.random() * 0.6;
      const sprite = this._getPooledSprite(this._fireTexture, color, size);
      sprite.position.set(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5,
        (Math.random() - 0.5) * 2
      );
      sprite.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        1.5 + Math.random() * 2, // rise slowly
        (Math.random() - 0.5) * 1.5
      );
      sprite.userData.isPooled = true;
      sprite.userData.flickerPhase = Math.random() * Math.PI * 2; // random flicker offset
      group.add(sprite);
      particles.push(sprite);
    }

    this.scene.add(group);
    this.activeEffects.push({
      type: 'fire',
      group,
      particles,
      lifetime: 0.5 + Math.random() * 0.5, // 0.5-1.0s
      elapsed: 0
    });
  }

  // Spec 009: Larger death explosion (40-50 particles) for unit/building destruction
  createDeathExplosion(position) {
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    // Fire particles: 40-50, bigger radius than regular explosion
    const fireCount = 40 + Math.floor(Math.random() * 11);
    for (let i = 0; i < fireCount; i++) {
      const size = 1.2 + Math.random() * 2.0;
      const sprite = this._getPooledSprite(
        this._fireTexture,
        Math.random() > 0.3 ? 0xff4400 : 0xffcc00,
        size
      );
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI;
      const speed = 6 + Math.random() * 14; // bigger spread
      sprite.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 7,
        Math.sin(angle) * Math.cos(elevation) * speed
      );
      sprite.userData.isPooled = true;
      group.add(sprite);
      particles.push(sprite);
    }

    // Heavier smoke cloud
    const smokeCount = 12;
    for (let i = 0; i < smokeCount; i++) {
      const size = 2.0 + Math.random() * 2.5;
      const sprite = this._getPooledSprite(this._smokeTexture, 0x222222, size);
      sprite.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        2.5 + Math.random() * 4,
        (Math.random() - 0.5) * 4
      );
      sprite.userData.isPooled = true;
      sprite.userData.isSmoke = true;
      group.add(sprite);
      particles.push(sprite);
    }

    this.scene.add(group);
    this.activeEffects.push({
      type: 'explosion',
      group,
      particles,
      lifetime: 1.0,
      elapsed: 0
    });

    this.createScorchMark(position);
  }

  // Spec 009: Water splash for projectiles/units entering water
  // Blue/white particles that spray upward and fall back down
  createWaterSplash(position) {
    const group = new THREE.Group();
    group.position.copy(position);
    group.position.y = Math.max(group.position.y, 0.2); // at water surface
    const particles = [];

    const count = 8 + Math.floor(Math.random() * 5); // 8-12 particles
    for (let i = 0; i < count; i++) {
      const color = Math.random() > 0.4 ? 0xaaddff : 0xffffff;
      const size = 0.3 + Math.random() * 0.4;
      const sprite = this._getPooledSprite(this._sparkTexture, color, size);
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      sprite.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        5 + Math.random() * 4, // spray upward
        Math.sin(angle) * speed
      );
      sprite.userData.isPooled = true;
      group.add(sprite);
      particles.push(sprite);
    }

    this.scene.add(group);
    this.activeEffects.push({
      type: 'explosion', // reuse explosion update logic (gravity + fade)
      group,
      particles,
      lifetime: 0.6,
      elapsed: 0
    });
  }

  createDamageVignette() {
    // Create a full-screen red border flash using CSS overlay
    if (this._vignetteEl) return; // already active

    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none;
      z-index: 500;
      border: 4px solid rgba(255, 0, 0, 0.6);
      box-shadow: inset 0 0 60px rgba(255, 0, 0, 0.3);
      transition: opacity 0.5s;
    `;
    document.body.appendChild(el);
    this._vignetteEl = el;

    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => {
        if (el.parentElement) el.parentElement.removeChild(el);
        this._vignetteEl = null;
      }, 500);
    }, 200);
  }

  update(delta) {
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      effect.elapsed += delta;
      const progress = effect.elapsed / effect.lifetime;

      if (progress >= 1.0) {
        // Return pooled sprites before removing
        if (effect.particles) {
          for (const p of effect.particles) {
            if (p.userData && p.userData.isPooled) {
              this._returnToPool(p);
            }
          }
        }
        if (effect.flash && effect.flash.userData && effect.flash.userData.isPooled) {
          this._returnToPool(effect.flash);
        }

        // Remove completed effect
        this.scene.remove(effect.group);
        if (effect.type === 'damageNumber') {
          effect.material.dispose();
          effect.texture.dispose();
        } else if (effect.type === 'trail') {
          if (effect.material) effect.material.dispose();
          if (effect.geometry) effect.geometry.dispose();
        } else if (effect.type === 'scorch') {
          if (effect.material) effect.material.dispose();
          if (effect.texture) effect.texture.dispose();
          if (effect.geometry) effect.geometry.dispose();
        } else if (effect.type === 'moveMarker') {
          if (effect.material) effect.material.dispose();
          if (effect.geometry) effect.geometry.dispose();
          // Remove from pool
          if (this._moveMarkerPool) {
            const pi = this._moveMarkerPool.indexOf(effect);
            if (pi !== -1) this._moveMarkerPool.splice(pi, 1);
          }
        } else {
          effect.group.traverse(child => {
            if (child.userData && child.userData.isPooled) return; // skip pooled sprites
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          });
        }
        this.activeEffects.splice(i, 1);
        continue;
      }

      if (effect.type === 'explosion') {
        // Expand particles outward and fade
        for (const particle of effect.particles) {
          particle.position.addScaledVector(particle.userData.velocity, delta);
          particle.userData.velocity.y -= 15 * delta; // gravity
          particle.material.opacity = 1.0 - progress;
          const scale = 1.0 + progress * 1.5;
          particle.scale.set(scale, scale, scale);
        }
      } else if (effect.type === 'muzzleFlash') {
        // Rapid fade out
        effect.flash.material.opacity = 1.0 - progress;
        effect.light.intensity = 3 * (1.0 - progress);
        const scale = 1.0 + progress * 2;
        effect.flash.scale.set(scale, scale, scale);
      } else if (effect.type === 'damageNumber') {
        // Float upward and fade out
        effect.group.position.y = effect.startY + progress * 4;
        effect.material.opacity = 1.0 - progress;
      } else if (effect.type === 'smoke') {
        for (const particle of effect.particles) {
          particle.position.addScaledVector(particle.userData.velocity, delta);
          particle.material.opacity = 0.6 * (1.0 - progress);
          const scale = 1.0 + progress * 2;
          particle.scale.set(scale, scale, scale);
        }
      } else if (effect.type === 'trail') {
        effect.material.opacity = 0.8 * (1.0 - progress);
      } else if (effect.type === 'debris') {
        for (const particle of effect.particles) {
          particle.position.addScaledVector(particle.userData.velocity, delta);
          particle.userData.velocity.y -= 15 * delta;
          if (particle.userData.rotSpeed) {
            particle.rotation.x += particle.userData.rotSpeed.x * delta;
            particle.rotation.y += particle.userData.rotSpeed.y * delta;
            particle.rotation.z += particle.userData.rotSpeed.z * delta;
          }
          particle.material.opacity = 1.0 - progress;
        }
      } else if (effect.type === 'trailPuff') {
        // Fade and expand small trail puffs
        for (const p of effect.particles) {
          p.position.addScaledVector(p.userData.velocity, delta);
          p.material.opacity = 0.7 * (1.0 - progress);
          const s = 1.0 + progress;
          p.scale.set(s, s, s);
        }
      } else if (effect.type === 'fire') {
        // Spec 009: Flickering fire particles rise and fade
        for (const particle of effect.particles) {
          particle.position.addScaledVector(particle.userData.velocity, delta);
          // Flicker: oscillate opacity for fire feel
          const flicker = 0.5 + 0.5 * Math.sin((effect.elapsed * 12) + (particle.userData.flickerPhase || 0));
          particle.material.opacity = flicker * (1.0 - progress);
          // Color shift between orange and red
          const t = 0.5 + 0.5 * Math.sin(effect.elapsed * 8 + (particle.userData.flickerPhase || 0));
          particle.material.color.setRGB(1.0, 0.2 + t * 0.4, 0.0);
          const scale = 0.8 + progress * 0.6;
          particle.scale.set(scale, scale, scale);
        }
      } else if (effect.type === 'scorch') {
        // GD-129: Fade scorch marks over time
        effect.material.opacity = 0.7 * (1.0 - progress);
      } else if (effect.type === 'moveMarker') {
        // Cycle 15: Fade out + slight expand
        effect.material.opacity = 0.8 * (1.0 - progress);
        const scale = 1.0 + progress * 0.5;
        effect.group.scale.set(scale, scale, scale);
      }
    }
  }
}
