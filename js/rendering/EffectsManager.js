import * as THREE from 'three';

export class EffectsManager {
  constructor(game) {
    this.game = game;
    this.scene = game.sceneManager.scene;
    this.activeEffects = [];
  }

  createExplosion(position) {
    const particleCount = 12;
    const group = new THREE.Group();
    group.position.copy(position);

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const size = 0.3 + Math.random() * 0.5;
      const geometry = new THREE.SphereGeometry(size, 6, 6);
      const color = Math.random() > 0.5 ? 0xff6600 : 0xffcc00;
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1.0
      });
      const particle = new THREE.Mesh(geometry, material);

      // Random outward direction
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI;
      const speed = 5 + Math.random() * 10;
      particle.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 5,
        Math.sin(angle) * Math.cos(elevation) * speed
      );

      group.add(particle);
      particles.push(particle);
    }

    this.scene.add(group);

    this.activeEffects.push({
      type: 'explosion',
      group: group,
      particles: particles,
      lifetime: 0.6,
      elapsed: 0
    });
  }

  createMuzzleFlash(position) {
    const group = new THREE.Group();
    group.position.copy(position);
    group.position.y += 2;

    // Bright emissive sphere
    const flashGeometry = new THREE.SphereGeometry(0.5, 6, 6);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 1.0
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    group.add(flash);

    // Point light for illumination
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

  update(delta) {
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      effect.elapsed += delta;
      const progress = effect.elapsed / effect.lifetime;

      if (progress >= 1.0) {
        // Remove completed effect
        this.scene.remove(effect.group);
        effect.group.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
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
      }
    }
  }
}
