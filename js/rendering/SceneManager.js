import * as THREE from 'three';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // sky blue
    this.scene.fog = new THREE.Fog(0x87CEEB, 200, 500);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('gameCanvas'),
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    this.camera.position.set(50, 80, 50);
    this.camera.lookAt(50, 0, 80);

    // Lighting
    // Strong ambient light to ensure nothing is too dark
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(this.ambientLight);

    // Main sun light
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.dirLight.position.set(100, 200, 100);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 500;
    this.dirLight.shadow.camera.left = -150;
    this.dirLight.shadow.camera.right = 150;
    this.dirLight.shadow.camera.top = 150;
    this.dirLight.shadow.camera.bottom = -150;
    this.scene.add(this.dirLight);

    // Secondary fill light from opposite side to eliminate dark shadows
    this.fillLight = new THREE.DirectionalLight(0xaabbcc, 0.8);
    this.fillLight.position.set(-80, 100, -60);
    this.scene.add(this.fillLight);

    // Back light for rim lighting effect
    this.backLight = new THREE.DirectionalLight(0xffeedd, 0.4);
    this.backLight.position.set(0, 50, -150);
    this.scene.add(this.backLight);

    // Hemisphere light: sky color from above, ground color from below
    this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x556633, 0.8);
    this.scene.add(this.hemiLight);

    // Day/Night cycle state
    this.dayNightEnabled = true;
    this.dayNightCycleDuration = 480; // 8 minutes full rotation
    this.dayNightTime = 0; // 0 = noon, 0.5 = midnight
    this.isNight = false;

    // Building night lights
    this._buildingLights = [];

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Performance: pre-allocated Color objects for day/night cycle (avoids 8+ allocations per frame)
  _dnDayColor = new THREE.Color(0xffffee);
  _dnNightColor = new THREE.Color(0x8899bb);
  _dnDayAmbient = new THREE.Color(0x8899cc);
  _dnNightAmbient = new THREE.Color(0x556688);
  _dnDaySky = new THREE.Color(0x87CEEB);
  _dnNightSky = new THREE.Color(0x334466);
  _dnDayBg = new THREE.Color(0x87CEEB);
  _dnNightBg = new THREE.Color(0x1a2540);
  _dnScratch = new THREE.Color();

  updateDayNight(deltaTime, gameElapsed) {
    if (!this.dayNightEnabled) return;

    // Calculate cycle position (0-1) where 0=noon, 0.25=sunset, 0.5=midnight, 0.75=sunrise
    this.dayNightTime = (gameElapsed % this.dayNightCycleDuration) / this.dayNightCycleDuration;

    // Smooth sine-based interpolation
    const sunAngle = this.dayNightTime * Math.PI * 2; // 0 to 2*PI
    const sunHeight = Math.sin(sunAngle); // 1 at noon, -1 at midnight

    // Normalize to 0-1 where 0 = darkest, 1 = brightest
    const brightness = (sunHeight + 1) / 2; // 0 to 1

    this.isNight = brightness < 0.35;

    const t = 1 - brightness;
    const s = this._dnScratch;

    // Directional light: warm during day, slightly dimmer at night
    s.copy(this._dnDayColor).lerp(this._dnNightColor, t);
    this.dirLight.color.copy(s);
    this.dirLight.intensity = 0.7 + brightness * 0.3;

    // Move directional light with sun position
    const sunX = Math.cos(sunAngle) * 150;
    const sunY = 50 + brightness * 100;
    this.dirLight.position.set(sunX, sunY, 100);

    // Ambient light: slightly blue-tinted at night but still bright
    s.copy(this._dnDayAmbient).lerp(this._dnNightAmbient, t);
    this.ambientLight.color.copy(s);
    this.ambientLight.intensity = 0.5 + brightness * 0.15;

    // Hemisphere light
    s.copy(this._dnDaySky).lerp(this._dnNightSky, t);
    this.hemiLight.color.copy(s);
    this.hemiLight.intensity = 0.3 + brightness * 0.1;

    // Scene background and fog color
    s.copy(this._dnDayBg).lerp(this._dnNightBg, t);
    this.scene.background.copy(s);
    if (this.scene.fog) {
      this.scene.fog.color.copy(s);
    }
  }

  // Get the current vision reduction factor for units (1.0 = full, 0.7 = night)
  getVisionMultiplier(unitType) {
    if (!this.dayNightEnabled || !this.isNight) return 1.0;
    // Scout car only -15% at night, everyone else -30%
    if (unitType === 'scoutcar') return 0.85;
    return 0.7;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
