import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as THREE from 'three';

// Toon outline + color quantization shader
// Combines depth-based edge detection with subtle color banding for a hand-drawn look
const ToonOutlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    outlineColor: { value: new THREE.Color(0x1a1a2e) }, // Dark blue-black
    outlineThickness: { value: 1.0 },
    outlineStrength: { value: 0.4 },
    colorBands: { value: 12.0 }, // Preserve painted material detail between bands.
    cameraNear: { value: 1.0 },
    cameraFar: { value: 500.0 }
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
    uniform sampler2D tDepth;
    uniform vec2 resolution;
    uniform vec3 outlineColor;
    uniform float outlineThickness;
    uniform float outlineStrength;
    uniform float colorBands;
    uniform float cameraNear;
    uniform float cameraFar;
    varying vec2 vUv;

    float getDepth(vec2 uv) {
      float d = texture2D(tDepth, uv).r;
      // Linearize depth
      float z = d * 2.0 - 1.0;
      return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
    }

    float getLuminance(vec3 color) {
      return dot(color, vec3(0.299, 0.587, 0.114));
    }

    void main() {
      vec2 texel = outlineThickness / resolution;
      vec4 center = texture2D(tDiffuse, vUv);

      // --- Depth-based edge detection (Sobel) ---
      float d = getDepth(vUv);
      float dL = getDepth(vUv + vec2(-texel.x, 0.0));
      float dR = getDepth(vUv + vec2( texel.x, 0.0));
      float dU = getDepth(vUv + vec2(0.0,  texel.y));
      float dD = getDepth(vUv + vec2(0.0, -texel.y));

      float depthEdge = abs(dL - d) + abs(dR - d) + abs(dU - d) + abs(dD - d);
      // Normalize by distance (far objects get thinner outlines)
      depthEdge = depthEdge / (d * 0.05 + 0.5);
      depthEdge = smoothstep(0.3, 1.5, depthEdge);

      // --- Color-based edge detection (catches edges depth misses) ---
      float lC = getLuminance(center.rgb);
      float lL = getLuminance(texture2D(tDiffuse, vUv + vec2(-texel.x, 0.0)).rgb);
      float lR = getLuminance(texture2D(tDiffuse, vUv + vec2( texel.x, 0.0)).rgb);
      float lU = getLuminance(texture2D(tDiffuse, vUv + vec2(0.0,  texel.y)).rgb);
      float lD = getLuminance(texture2D(tDiffuse, vUv + vec2(0.0, -texel.y)).rgb);
      float colorEdge = abs(lL - lC) + abs(lR - lC) + abs(lU - lC) + abs(lD - lC);
      colorEdge = smoothstep(0.22, 0.65, colorEdge);

      float edge = max(depthEdge, colorEdge * 0.22) * outlineStrength;

      // --- Subtle color quantization (cel-shading bands) ---
      vec3 quantized = floor(center.rgb * colorBands + 0.5) / colorBands;
      // Keep broad stylized shapes without outlining every grass texture fleck.
      vec3 finalColor = mix(center.rgb, quantized, 0.18);

      // --- Apply outline ---
      finalColor = mix(finalColor, outlineColor, clamp(edge, 0.0, 1.0));

      gl_FragColor = vec4(finalColor, center.a);
    }
  `
};

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
      float vig = 1.0 - darkness * smoothstep(0.20, 0.80, dist);
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
    this.toonPass = null;
    this.depthTarget = null;

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

    const w = window.innerWidth, h = window.innerHeight;
    this.composer = new EffectComposer(renderer);
    // The main scene pass supplies depth directly. No second scene/shadow render.
    for (const target of [this.composer.renderTarget1, this.composer.renderTarget2]) {
      target.depthBuffer = true;
      target.depthTexture = new THREE.DepthTexture(target.width, target.height);
      target.depthTexture.type = THREE.UnsignedIntType;
    }

    // Render pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    this.toonPass = new ShaderPass(ToonOutlineShader);
    this.toonPass.uniforms.cameraNear.value = camera.near;
    this.toonPass.uniforms.cameraFar.value = camera.far;
    const renderOutline = this.toonPass.render.bind(this.toonPass);
    this.toonPass.render = (renderer, writeBuffer, readBuffer, ...args) => {
      this.toonPass.uniforms.tDepth.value = readBuffer.depthTexture;
      renderOutline(renderer, writeBuffer, readBuffer, ...args);
    };
    this.composer.addPass(this.toonPass);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w,h), 0.25, 0.4, 0.85);
    this.composer.addPass(this.bloomPass);

    // Vignette pass
    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms.offset.value = 1.0;
    this.vignettePass.uniforms.darkness.value = 0.22;
    this.composer.addPass(this.vignettePass);

    // Present linear render targets in the display color space exactly once.
    this.composer.addPass(new OutputPass());

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.resize();
  }

  resize() {
    if (!this.composer) return;
    const renderer = this.sceneManager.renderer;
    const size = renderer.getSize(new THREE.Vector2());
    const ratio = renderer.getPixelRatio();
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(size.x, size.y);
    this.toonPass?.uniforms.resolution.value.set(size.x * ratio, size.y * ratio);
  }

  configure(graphics) {
    if (this.bloomPass) this.bloomPass.enabled = !!graphics.bloom;
    if (this.vignettePass) this.vignettePass.enabled = !!graphics.vignette;
    if (this.toonPass) this.toonPass.enabled = graphics.quality === 'high' || graphics.quality === 'ultra';
    this.enabled = !!(this.bloomPass?.enabled || this.vignettePass?.enabled || this.toonPass?.enabled);
    this.resize();
  }

  render() {
    if (this.enabled && this.composer) this.composer.render();
    else this.sceneManager.render();
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
    if (this.depthTarget) {
      this.depthTarget.dispose();
      if (this.depthTarget.depthTexture) this.depthTarget.depthTexture.dispose();
      this.depthTarget = null;
    }
    if (this.composer) {
      for (const pass of this.composer.passes) pass.dispose?.();
      this.composer.dispose();
    }
    this.composer = null;
    this.bloomPass = null;
    this.vignettePass = null;
    this.toonPass = null;
  }
}
