import * as THREE from 'three';

/**
 * SkyboxManager - Creates atmospheric skybox with gradient sky, clouds, and sun.
 * Uses procedural generation since we can't guarantee CDN access for HDRIs.
 */
export class SkyboxManager {
  constructor(scene) {
    this.scene = scene;
    this.skyMesh = null;
    this.sunMesh = null;
    this.cloudGroup = null;
    this.timeOfDay = 0.25; // 0=midnight, 0.25=sunrise, 0.5=noon, 0.75=sunset

    this._createSky();
    this._createClouds();
    this._createSun();
  }

  _createSky() {
    // Procedural gradient sky using a large sphere with custom shader
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;

      void main() {
        float h = normalize(vWorldPosition - cameraPosition).y;
        float t = max(pow(max(h + offset, 0.0), exponent), 0.0);

        vec3 color;
        if (h > 0.0) {
          color = mix(horizonColor, topColor, t);
        } else {
          float bt = max(pow(max(-h, 0.0), 0.5), 0.0);
          color = mix(horizonColor, bottomColor, bt);
        }

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const skyGeo = new THREE.SphereGeometry(400, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        topColor: { value: new THREE.Color(0x0077be) },
        horizonColor: { value: new THREE.Color(0x87CEEB) },
        bottomColor: { value: new THREE.Color(0x556633) },
        offset: { value: 0.0 },
        exponent: { value: 0.6 },
      },
      side: THREE.BackSide,
      depthWrite: false,
    });

    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.skyMesh.renderOrder = -1;
    this.scene.add(this.skyMesh);
  }

  _createClouds() {
    this.cloudGroup = new THREE.Group();
    this.cloudGroup.position.y = 150;

    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });

    // Generate 15-20 cloud clusters
    for (let i = 0; i < 18; i++) {
      const cloud = new THREE.Group();
      const numPuffs = 3 + Math.floor(Math.random() * 4);

      for (let j = 0; j < numPuffs; j++) {
        const size = 8 + Math.random() * 12;
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(size, 8, 6),
          cloudMat.clone()
        );
        puff.position.set(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 10
        );
        puff.scale.y = 0.4; // Flatten
        puff.material.opacity = 0.2 + Math.random() * 0.3;
        cloud.add(puff);
      }

      cloud.position.set(
        (Math.random() - 0.5) * 600,
        Math.random() * 30,
        (Math.random() - 0.5) * 600
      );
      cloud._speed = 0.5 + Math.random() * 1.5;
      this.cloudGroup.add(cloud);
    }

    this.scene.add(this.cloudGroup);
  }

  _createSun() {
    const sunGeo = new THREE.SphereGeometry(8, 16, 8);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffffcc,
      transparent: true,
      opacity: 0.8,
    });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.set(200, 120, -100);
    this.scene.add(this.sunMesh);

    // Sun glow (lens flare effect with sprite)
    const glowMat = new THREE.SpriteMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(40, 40, 1);
    this.sunMesh.add(glow);
  }

  /**
   * Update sky based on time of day (0-1)
   * 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
   */
  update(delta, timeOfDay) {
    this.timeOfDay = timeOfDay;

    // Update sky colors
    const uniforms = this.skyMesh.material.uniforms;

    // Interpolate colors based on time
    const brightness = Math.sin(timeOfDay * Math.PI * 2) * 0.5 + 0.5;

    const dayTop = new THREE.Color(0x0077be);
    const nightTop = new THREE.Color(0x0a0a2e);
    const sunsetTop = new THREE.Color(0x1a3a5e);

    const dayHorizon = new THREE.Color(0x87CEEB);
    const nightHorizon = new THREE.Color(0x1a1a3e);
    const sunsetHorizon = new THREE.Color(0xff6644);

    // Determine phase
    const sunAngle = timeOfDay * Math.PI * 2;
    const isSunset = (timeOfDay > 0.6 && timeOfDay < 0.85);
    const isSunrise = (timeOfDay > 0.1 && timeOfDay < 0.35);

    if (isSunset || isSunrise) {
      const t = isSunset
        ? (timeOfDay - 0.6) / 0.25
        : (timeOfDay - 0.1) / 0.25;
      const peak = Math.sin(t * Math.PI);
      uniforms.topColor.value.copy(dayTop).lerp(sunsetTop, peak * 0.5);
      uniforms.horizonColor.value.copy(dayHorizon).lerp(sunsetHorizon, peak * 0.7);
    } else {
      uniforms.topColor.value.copy(nightTop).lerp(dayTop, brightness);
      uniforms.horizonColor.value.copy(nightHorizon).lerp(dayHorizon, brightness);
    }

    // Move sun
    if (this.sunMesh) {
      const sunX = Math.cos(sunAngle) * 250;
      const sunY = Math.sin(sunAngle) * 200 + 50;
      this.sunMesh.position.set(sunX, Math.max(sunY, -50), -150);
      this.sunMesh.material.opacity = sunY > 0 ? 0.8 : 0;
      this.sunMesh.visible = sunY > -20;
    }

    // Animate clouds
    if (this.cloudGroup) {
      for (const cloud of this.cloudGroup.children) {
        cloud.position.x += cloud._speed * delta;
        // Wrap around
        if (cloud.position.x > 350) cloud.position.x = -350;
      }

      // Cloud brightness
      const cloudBrightness = 0.3 + brightness * 0.7;
      this.cloudGroup.traverse(child => {
        if (child.isMesh) {
          child.material.color.setRGB(cloudBrightness, cloudBrightness, cloudBrightness);
        }
      });
    }
  }

  dispose() {
    if (this.skyMesh) {
      this.skyMesh.geometry.dispose();
      this.skyMesh.material.dispose();
      this.scene.remove(this.skyMesh);
    }
    if (this.sunMesh) {
      this.sunMesh.geometry.dispose();
      this.sunMesh.material.dispose();
      this.scene.remove(this.sunMesh);
    }
    if (this.cloudGroup) {
      this.cloudGroup.traverse(child => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
      this.scene.remove(this.cloudGroup);
    }
  }
}
