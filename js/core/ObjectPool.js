import * as THREE from 'three';

/**
 * Generic Object Pool — eliminates GC pressure from frequently created/destroyed objects.
 *
 * Usage:
 *   const pool = new ObjectPool(MyClass, { maxSize: 200 });
 *   const obj = pool.acquire(...constructorArgs);
 *   pool.release(obj);
 *
 * For Three.js meshes the pool stores geometry+material and just toggles visibility.
 */
export class ObjectPool {
  /**
   * @param {Function} factory    - () => newObject   (called when pool is empty)
   * @param {Function} reset      - (obj) => void     (called on acquire to reinitialise)
   * @param {Function} deactivate - (obj) => void     (called on release to hide/disable)
   * @param {number}   maxSize    - hard cap on pooled (inactive) objects
   */
  constructor(factory, reset, deactivate, maxSize = 200) {
    this._factory = factory;
    this._reset = reset;
    this._deactivate = deactivate;
    this._maxSize = maxSize;
    this._pool = [];
    this._activeCount = 0;
  }

  /** Get an object from the pool (or create one). */
  acquire(...args) {
    let obj;
    if (this._pool.length > 0) {
      obj = this._pool.pop();
    } else {
      obj = this._factory(...args);
    }
    this._reset(obj, ...args);
    this._activeCount++;
    return obj;
  }

  /** Return an object to the pool. */
  release(obj) {
    this._deactivate(obj);
    this._activeCount--;
    if (this._pool.length < this._maxSize) {
      this._pool.push(obj);
    }
    // else: discard (let GC collect if over cap)
  }

  get activeCount() { return this._activeCount; }
  get pooledCount() { return this._pool.length; }

  /** Dispose all pooled objects (call on game restart). */
  dispose(disposeFn) {
    for (const obj of this._pool) {
      if (disposeFn) disposeFn(obj);
    }
    this._pool.length = 0;
    this._activeCount = 0;
  }
}

// ─────────────────────────────────────────────────────────────
// Pre-built pools for common game objects
// ─────────────────────────────────────────────────────────────

const _sharedProjectileGeo = new THREE.SphereGeometry(0.2, 4, 4);
const _sharedProjectileMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

/**
 * Pool for projectile meshes (just the Three.js mesh, not the Projectile logic object).
 * The Projectile class should call acquireProjectileMesh / releaseProjectileMesh.
 */
export const projectileMeshPool = new ObjectPool(
  // factory
  () => {
    const mesh = new THREE.Mesh(
      _sharedProjectileGeo,
      _sharedProjectileMat.clone()
    );
    mesh.visible = false;
    return mesh;
  },
  // reset
  (mesh) => {
    mesh.visible = true;
  },
  // deactivate
  (mesh) => {
    mesh.visible = false;
  },
  300 // max pooled
);

const _sharedExplosionGeo = new THREE.SphereGeometry(1, 6, 6);

/**
 * Pool for explosion/particle sphere meshes used by EffectsManager.
 */
export const explosionMeshPool = new ObjectPool(
  () => {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(_sharedExplosionGeo, mat);
    mesh.visible = false;
    return mesh;
  },
  (mesh) => {
    mesh.visible = true;
    mesh.scale.set(1, 1, 1);
    mesh.material.opacity = 1;
  },
  (mesh) => {
    mesh.visible = false;
  },
  200
);
