import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
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
    outlineThickness: { value: 1.5 },
    outlineStrength: { value: 0.8 },
    colorBands: { value: 6.0 }, // Number of color quantization levels
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
      colorEdge = smoothstep(0.15, 0.5, colorEdge);

      float edge = max(depthEdge, colorEdge * 0.6) * outlineStrength;

      // --- Subtle color quantization (cel-shading bands) ---
      vec3 quantized = floor(center.rgb * colorBands + 0.5) / colorBands;
      // Blend 40% toward quantized for subtle banding (not full cartoon)
      vec3 finalColor = mix(center.rgb, quantized, 0.35);

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

    // Create depth render target for outline detection
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.depthTarget = new THREE.WebGLRenderTarget(w, h, {
      depthTexture: new THREE.DepthTexture(w, h),
      depthBuffer: true
    });
    this.depthTarget.depthTexture.format = THREE.DepthFormat;
    this.depthTarget.depthTexture.type = THREE.UnsignedIntType;

    // Create composer
    this.composer = new EffectComposer(renderer);

    // Render pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // Bloom pass - subtle glow for emissive materials
    const resolution = new THREE.Vector2(w, h);
    this.bloomPass = new UnrealBloomPass(resolution, 0.25, 0.4, 0.85);
    this.composer.addPass(this.bloomPass);

    // Toon outline pass — depth-based outlines + color quantization
    this.toonPass = new ShaderPass(ToonOutlineShader);
    this.toonPass.uniforms.resolution.value.set(w, h);
    this.toonPass.uniforms.tDepth.value = this.depthTarget.depthTexture;
    this.toonPass.uniforms.cameraNear.value = camera.near;
    this.toonPass.uniforms.cameraFar.value = camera.far;
    this.composer.addPass(this.toonPass);

    // Vignette pass
    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms.offset.value = 1.3;
    this.vignettePass.uniforms.darkness.value = 0.5;
    this.composer.addPass(this.vignettePass);

    // Handle resize
    this._onResize = () => {
      const rw = window.innerWidth;
      const rh = window.innerHeight;
      if (this.composer) {
        this.composer.setSize(rw, rh);
      }
      if (this.depthTarget) {
        this.depthTarget.setSize(rw, rh);
      }
      if (this.toonPass) {
        this.toonPass.uniforms.resolution.value.set(rw, rh);
      }
    };
    window.addEventListener('resize', this._onResize);
  }

  render() {
    if (this.enabled && this.composer) {
      // Render scene to depth target first (for outline detection)
      if (this.depthTarget && this.toonPass) {
        const renderer = this.sceneManager.renderer;
        renderer.setRenderTarget(this.depthTarget);
        renderer.render(this.sceneManager.scene, this.sceneManager.camera);
        renderer.setRenderTarget(null);
        this.toonPass.uniforms.tDepth.value = this.depthTarget.depthTexture;
      }
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
    if (this.depthTarget) {
      this.depthTarget.dispose();
      if (this.depthTarget.depthTexture) this.depthTarget.depthTexture.dispose();
      this.depthTarget = null;
    }
    this.composer = null;
    this.bloomPass = null;
    this.vignettePass = null;
    this.toonPass = null;
  }
}
