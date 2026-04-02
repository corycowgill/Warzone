import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as THREE from 'three';

// Vignette shader
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 1.0 },
    darkness: { value: 1.2 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
      float dist = length(uv);
      float vig = smoothstep(0.8, offset * 0.6, dist * (darkness + offset));
      texel.rgb *= vig;
      gl_FragColor = texel;
    }
  `
};

export class PostProcessing {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.enabled = true;
    this.composer = null;
    this.bloomPass = null;
    this.vignettePass = null;

    try {
      this._setup();
    } catch (e) {
      console.warn('Post-processing failed to initialize, falling back to standard rendering:', e.message);
      this.enabled = false;
    }
  }

  _setup() {
    const renderer = this.sceneManager.renderer;
    const scene = this.sceneManager.scene;
    const camera = this.sceneManager.camera;

    // Create composer
    this.composer = new EffectComposer(renderer);

    // Render pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // Bloom pass - subtle glow for emissive materials
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.bloomPass = new UnrealBloomPass(resolution, 0.3, 0.4, 0.85);
    this.composer.addPass(this.bloomPass);

    // Vignette pass
    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms.offset.value = 1.0;
    this.vignettePass.uniforms.darkness.value = 1.1;
    this.composer.addPass(this.vignettePass);

    // Handle resize
    this._onResize = () => {
      if (this.composer) {
        this.composer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', this._onResize);
  }

  render() {
    if (this.enabled && this.composer) {
      this.composer.render();
    } else {
      this.sceneManager.render();
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setBloomStrength(strength) {
    if (this.bloomPass) {
      this.bloomPass.strength = strength;
    }
  }

  dispose() {
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      this._onResize = null;
    }
    this.composer = null;
    this.bloomPass = null;
    this.vignettePass = null;
  }
}
