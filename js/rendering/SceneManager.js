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
    this.ambientLight = new THREE.AmbientLight(0x6688cc, 0.5);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.dirLight.position.set(100, 150, 100);
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

    this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x556633, 0.3);
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

    // Directional light: warm during day, dim at night
    const dayColor = new THREE.Color(0xffffee);
    const nightColor = new THREE.Color(0x223355);
    const dirColor = dayColor.clone().lerp(nightColor, 1 - brightness);
    this.dirLight.color.copy(dirColor);
    this.dirLight.intensity = 0.2 + brightness * 0.8;

    // Move directional light with sun position
    const sunX = Math.cos(sunAngle) * 150;
    const sunY = 50 + brightness * 100;
    this.dirLight.position.set(sunX, sunY, 100);

    // Ambient light: blue-tinted at night
    const dayAmbient = new THREE.Color(0x6688cc);
    const nightAmbient = new THREE.Color(0x1a2244);
    const ambColor = dayAmbient.clone().lerp(nightAmbient, 1 - brightness);
    this.ambientLight.color.copy(ambColor);
    this.ambientLight.intensity = 0.2 + brightness * 0.3;

    // Hemisphere light
    const daySky = new THREE.Color(0x87CEEB);
    const nightSky = new THREE.Color(0x0a1030);
    const skyColor = daySky.clone().lerp(nightSky, 1 - brightness);
    this.hemiLight.color.copy(skyColor);
    this.hemiLight.intensity = 0.1 + brightness * 0.2;

    // Scene background and fog color
    const dayBg = new THREE.Color(0x87CEEB);
    const nightBg = new THREE.Color(0x0a1020);
    const bgColor = dayBg.clone().lerp(nightBg, 1 - brightness);
    this.scene.background.copy(bgColor);
    if (this.scene.fog) {
      this.scene.fog.color.copy(bgColor);
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
