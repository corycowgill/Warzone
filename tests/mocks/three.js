/**
 * Mock Three.js module for unit testing.
 * Provides stub implementations of Three.js classes used throughout the game.
 */

export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(x, y) { this.x = x; this.y = y; return this; }
  clone() { return new Vector2(this.x, this.y); }
  copy(v) { this.x = v.x; this.y = v.y; return this; }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; return this; }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
  normalize() { const l = this.length(); if (l > 0) { this.x /= l; this.y /= l; } return this; }
  distanceTo(v) { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2); }
}

export class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  normalize() { const l = this.length(); if (l > 0) { this.x /= l; this.y /= l; this.z /= l; } return this; }
  distanceTo(v) { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2 + (this.z - v.z) ** 2); }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; }
  applyQuaternion() { return this; }
  setFromMatrixPosition() { return this; }
}

export class Color {
  constructor(r = 0, g = 0, b = 0) {
    if (typeof r === 'number' && g === undefined) {
      this.r = ((r >> 16) & 0xff) / 255;
      this.g = ((r >> 8) & 0xff) / 255;
      this.b = (r & 0xff) / 255;
    } else {
      this.r = r; this.g = g; this.b = b;
    }
  }
  set() { return this; }
  clone() { return new Color(this.r, this.g, this.b); }
}

export class Quaternion {
  constructor() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; }
}

export class Euler {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
}

export class Object3D {
  constructor() {
    this.position = new Vector3();
    this.rotation = new Euler();
    this.scale = new Vector3(1, 1, 1);
    this.children = [];
    this.parent = null;
    this.visible = true;
    this.userData = {};
  }
  add(child) { this.children.push(child); child.parent = this; }
  remove(child) { const i = this.children.indexOf(child); if (i >= 0) this.children.splice(i, 1); }
  traverse(fn) { fn(this); for (const c of this.children) if (c.traverse) c.traverse(fn); }
  lookAt() {}
}

export class Group extends Object3D {}

export class Mesh extends Object3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.isMesh = true;
  }
}

export class BoxGeometry {
  constructor(w, h, d) { this.parameters = { width: w, height: h, depth: d }; }
  dispose() {}
}

export class SphereGeometry {
  constructor(r) { this.parameters = { radius: r }; }
  dispose() {}
}

export class CylinderGeometry {
  constructor() {}
  dispose() {}
}

export class PlaneGeometry {
  constructor() {}
  dispose() {}
}

export class BufferGeometry {
  constructor() { this.attributes = {}; }
  setAttribute() { return this; }
  setFromPoints() { return this; }
  dispose() {}
}

export class MeshPhongMaterial {
  constructor(params = {}) { Object.assign(this, params); }
  dispose() {}
}

export class MeshBasicMaterial {
  constructor(params = {}) { Object.assign(this, params); }
  dispose() {}
}

export class MeshStandardMaterial {
  constructor(params = {}) { Object.assign(this, params); }
  dispose() {}
}

export class LineBasicMaterial {
  constructor(params = {}) { Object.assign(this, params); }
  dispose() {}
}

export class Line extends Object3D {
  constructor(geo, mat) { super(); this.geometry = geo; this.material = mat; }
}

export class Scene extends Object3D {}

export class Raycaster {
  constructor() {}
  setFromCamera() {}
  intersectObjects() { return []; }
}

export class WebGLRenderer {
  constructor() {
    this.domElement = { addEventListener: () => {}, removeEventListener: () => {}, style: {} };
    this.shadowMap = { enabled: false };
  }
  setSize() {}
  setPixelRatio() {}
  render() {}
  dispose() {}
}

export class PerspectiveCamera extends Object3D {
  constructor() { super(); this.fov = 60; this.aspect = 1; this.near = 0.1; this.far = 1000; }
  updateProjectionMatrix() {}
}

export class AmbientLight extends Object3D {
  constructor(color, intensity) { super(); this.color = new Color(color); this.intensity = intensity; }
}

export class DirectionalLight extends Object3D {
  constructor(color, intensity) {
    super();
    this.color = new Color(color);
    this.intensity = intensity;
    this.shadow = { camera: { left: 0, right: 0, top: 0, bottom: 0 }, mapSize: { width: 0, height: 0 } };
    this.target = new Object3D();
  }
}

export class Float32BufferAttribute {
  constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; }
}

export const MathUtils = {
  clamp: (v, min, max) => Math.min(Math.max(v, min), max),
  lerp: (a, b, t) => a + (b - a) * t,
  degToRad: (d) => d * Math.PI / 180,
  radToDeg: (r) => r * 180 / Math.PI,
};

// Re-export everything for wildcard imports
export default {
  Vector2, Vector3, Color, Quaternion, Euler,
  Object3D, Group, Mesh,
  BoxGeometry, SphereGeometry, CylinderGeometry, PlaneGeometry, BufferGeometry,
  MeshPhongMaterial, MeshBasicMaterial, MeshStandardMaterial, LineBasicMaterial,
  Line, Scene, Raycaster, WebGLRenderer, PerspectiveCamera,
  AmbientLight, DirectionalLight,
  Float32BufferAttribute, MathUtils,
};
