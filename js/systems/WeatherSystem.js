import * as THREE from 'three';
import { WEATHER_CONFIG } from '../core/Constants.js';

/**
 * GD-112: Dynamic Weather System
 * Changes weather every 3-4 minutes, affecting gameplay and visuals.
 */
export class WeatherSystem {
  constructor(game) {
    this.game = game;
    this.currentWeather = 'clear';
    this.nextWeather = null;
    this.weatherTimer = 0;
    this.transitionTimer = 0;
    this.transitioning = false;
    this.transitionDuration = WEATHER_CONFIG.transitionDuration;

    // Determine weather pool from map template
    const template = game.terrain?.mapTemplate || 'random';
    this.weatherPool = WEATHER_CONFIG.mapWeatherPool[template] || WEATHER_CONFIG.mapWeatherPool.random;

    // Set initial change timer
    const [min, max] = WEATHER_CONFIG.changeInterval;
    this.weatherTimer = min + Math.random() * (max - min);

    // Particle system for rain/sandstorm
    this.particles = null;
    this.particleGroup = new THREE.Group();
    if (game.sceneManager) {
      game.sceneManager.scene.add(this.particleGroup);
    }

    // Fog overlay (screen-space via scene fog manipulation)
    this._originalFogNear = game.sceneManager?.scene?.fog?.near || 200;
    this._originalFogFar = game.sceneManager?.scene?.fog?.far || 500;
    this._originalFogColor = game.sceneManager?.scene?.fog?.color?.clone() || new THREE.Color(0x87CEEB);
  }

  update(delta) {
    // Weather change timer
    this.weatherTimer -= delta;
    if (this.weatherTimer <= 0 && !this.transitioning) {
      this.startTransition();
    }

    // Handle transition
    if (this.transitioning) {
      this.transitionTimer += delta;
      const t = Math.min(1, this.transitionTimer / this.transitionDuration);

      if (t >= 1) {
        this.transitioning = false;
        this.currentWeather = this.nextWeather;
        this.nextWeather = null;
        this.applyWeatherEffects();

        // Reset timer for next weather change
        const [min, max] = WEATHER_CONFIG.changeInterval;
        this.weatherTimer = min + Math.random() * (max - min);
      } else {
        // Interpolate visual effects
        this.updateTransitionVisuals(t);
      }
    }

    // Update particles
    this.updateParticles(delta);

    // Apply sandstorm damage to exposed infantry
    const weatherData = WEATHER_CONFIG.types[this.currentWeather];
    if (weatherData && weatherData.infantryDPS > 0) {
      this._damageTimer = (this._damageTimer || 0) + delta;
      if (this._damageTimer >= 1.0) {
        this._damageTimer = 0;
        const allUnits = this.game.entities.filter(e => e.isUnit && e.alive && e.type === 'infantry');
        for (const unit of allUnits) {
          // Check if infantry is in a building (garrisoned) - protected from sandstorm
          if (!unit.isGarrisoned) {
            unit.health = Math.max(1, unit.health - weatherData.infantryDPS);
          }
        }
      }
    }
  }

  startTransition() {
    // Pick a random weather different from current
    const pool = this.weatherPool.filter(w => w !== this.currentWeather);
    if (pool.length === 0) return;

    this.nextWeather = pool[Math.floor(Math.random() * pool.length)];
    this.transitioning = true;
    this.transitionTimer = 0;

    // Notify HUD
    if (this.game.uiManager?.hud) {
      const weatherName = WEATHER_CONFIG.types[this.nextWeather]?.name || this.nextWeather;
      this.game.uiManager.hud.showNotification(`Weather changing to: ${weatherName}`, '#88aaff');
    }
  }

  updateTransitionVisuals(t) {
    const scene = this.game.sceneManager?.scene;
    if (!scene || !scene.fog) return;

    const nextData = WEATHER_CONFIG.types[this.nextWeather];
    if (!nextData) return;

    // Fog distance transition
    if (this.nextWeather === 'fog') {
      scene.fog.near = this._originalFogNear * (1 - t) + 50 * t;
      scene.fog.far = this._originalFogFar * (1 - t) + 150 * t;
    } else if (this.nextWeather === 'sandstorm') {
      scene.fog.near = this._originalFogNear * (1 - t) + 80 * t;
      scene.fog.far = this._originalFogFar * (1 - t) + 200 * t;
    }

    // Fog color transition for sandstorm
    if (nextData.color) {
      const targetColor = new THREE.Color(nextData.color);
      scene.fog.color.copy(this._originalFogColor).lerp(targetColor, t);
      scene.background = scene.fog.color.clone();
    }
  }

  applyWeatherEffects() {
    const scene = this.game.sceneManager?.scene;
    const weatherData = WEATHER_CONFIG.types[this.currentWeather];
    if (!weatherData) return;

    // Apply vision and speed multipliers to all units
    // (These are checked in CombatSystem and Unit.update via game.weatherSystem)

    // Set fog based on weather
    if (scene && scene.fog) {
      if (this.currentWeather === 'fog') {
        scene.fog.near = 50;
        scene.fog.far = 150;
        scene.fog.color.set(0xaabbcc);
        scene.background = scene.fog.color.clone();
      } else if (this.currentWeather === 'sandstorm') {
        scene.fog.near = 80;
        scene.fog.far = 200;
        scene.fog.color.set(0xccaa77);
        scene.background = scene.fog.color.clone();
      } else if (this.currentWeather === 'rain') {
        scene.fog.near = 150;
        scene.fog.far = 400;
        scene.fog.color.set(0x667788);
        scene.background = scene.fog.color.clone();
      } else {
        // Clear - restore defaults
        scene.fog.near = this._originalFogNear;
        scene.fog.far = this._originalFogFar;
        scene.fog.color.copy(this._originalFogColor);
        scene.background = scene.fog.color.clone();
      }
    }

    // Create or destroy particles
    this.setupParticles();
  }

  setupParticles() {
    // Remove old particles
    while (this.particleGroup.children.length > 0) {
      const child = this.particleGroup.children[0];
      this.particleGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    const weatherData = WEATHER_CONFIG.types[this.currentWeather];
    if (!weatherData || !weatherData.particleColor) return;

    const count = this.currentWeather === 'rain' ? 2000 : 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    const spread = 200;
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = Math.random() * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;

      if (this.currentWeather === 'rain') {
        velocities[i * 3] = 0;
        velocities[i * 3 + 1] = -40 - Math.random() * 20; // Fast downward
        velocities[i * 3 + 2] = -5; // Slight angle
      } else {
        // Sandstorm - horizontal
        velocities[i * 3] = 15 + Math.random() * 10;
        velocities[i * 3 + 1] = -2 + Math.random() * 4;
        velocities[i * 3 + 2] = 5 + Math.random() * 5;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this._particleVelocities = velocities;

    const material = new THREE.PointsMaterial({
      color: weatherData.particleColor,
      size: this.currentWeather === 'rain' ? 0.3 : 0.8,
      transparent: true,
      opacity: this.currentWeather === 'rain' ? 0.4 : 0.3,
      depthWrite: false,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    this.particleGroup.add(points);
    this.particles = points;
  }

  updateParticles(delta) {
    if (!this.particles || !this._particleVelocities) return;

    // Follow camera
    const camera = this.game.sceneManager?.camera;
    if (camera) {
      this.particleGroup.position.x = camera.position.x;
      this.particleGroup.position.z = camera.position.z;
    }

    const positions = this.particles.geometry.attributes.position.array;
    const velocities = this._particleVelocities;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
      positions[i * 3] += velocities[i * 3] * delta;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;

      // Reset particles that fall below ground or go too far
      if (positions[i * 3 + 1] < -5 || positions[i * 3] > 100) {
        positions[i * 3] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = 60 + Math.random() * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  /** Get current weather vision multiplier */
  getVisionMultiplier() {
    const data = WEATHER_CONFIG.types[this.currentWeather];
    return data ? data.visionMult : 1.0;
  }

  /** Get current weather speed multiplier */
  getSpeedMultiplier() {
    const data = WEATHER_CONFIG.types[this.currentWeather];
    return data ? data.speedMult : 1.0;
  }

  /** Get current weather name for HUD */
  getWeatherName() {
    const data = WEATHER_CONFIG.types[this.currentWeather];
    return data ? data.name : 'Clear';
  }

  dispose() {
    while (this.particleGroup.children.length > 0) {
      const child = this.particleGroup.children[0];
      this.particleGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    if (this.game.sceneManager) {
      this.game.sceneManager.scene.remove(this.particleGroup);
    }
  }
}
