import * as THREE from 'three';

/**
 * Vec3Pool — Pre-allocated pool of THREE.Vector3 for hot paths.
 * Avoids garbage collection pressure from creating new Vector3 every frame.
 *
 * Usage:
 *   const v = Vec3Pool.acquire();
 *   v.set(x, y, z);
 *   // ... use v ...
 *   Vec3Pool.release(v);
 *
 * IMPORTANT: Always release vectors when done. If pool is exhausted,
 * a new Vector3 is created (no crash), but a warning is logged.
 */
const POOL_SIZE = 32;

class _Vec3Pool {
  constructor() {
    this._pool = [];
    this._inUse = 0;
    for (let i = 0; i < POOL_SIZE; i++) {
      this._pool.push(new THREE.Vector3());
    }
  }

  /**
   * Acquire a Vector3 from the pool. Caller MUST release() it when done.
   * @returns {THREE.Vector3}
   */
  acquire() {
    if (this._pool.length > 0) {
      this._inUse++;
      return this._pool.pop();
    }
    // Pool exhausted — create a new one (won't crash, but indicates pool is too small)
    this._inUse++;
    return new THREE.Vector3();
  }

  /**
   * Return a Vector3 to the pool for reuse.
   * @param {THREE.Vector3} v
   */
  release(v) {
    if (!v) return;
    v.set(0, 0, 0);
    this._pool.push(v);
    this._inUse--;
  }

  /** How many vectors are currently checked out */
  get activeCount() {
    return this._inUse;
  }
}

export const Vec3Pool = new _Vec3Pool();
