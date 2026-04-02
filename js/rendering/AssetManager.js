import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * AssetManager - Loads and caches GLTF/GLB models for environment (trees, etc).
 */
export class AssetManager {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();       // key -> { scene, animations }
    this.pending = new Map();     // key -> Promise
    this.ready = false;
    this.errors = [];
  }

  static MANIFEST = {
    // --- Environment ---
    tree_default:  { path: 'assets/models/environment/nature-kit/tree_default.glb',  targetSize: 4.0 },
    tree_oak:      { path: 'assets/models/environment/nature-kit/tree_oak.glb',      targetSize: 4.5 },
    tree_cone:     { path: 'assets/models/environment/nature-kit/tree_cone.glb',     targetSize: 4.0 },
    tree_detailed: { path: 'assets/models/environment/nature-kit/tree_detailed.glb', targetSize: 4.0 },
    tree_fat:      { path: 'assets/models/environment/nature-kit/tree_fat.glb',      targetSize: 4.5 },
    tree_palm:     { path: 'assets/models/environment/nature-kit/tree_palm.glb',     targetSize: 4.0 },
  };

  async preloadAll() {
    const entries = Object.entries(AssetManager.MANIFEST);
    const promises = entries.map(([key, info]) => this.load(key, info.path));
    await Promise.allSettled(promises);
    this.ready = true;
    console.log(`AssetManager: ${this.cache.size}/${entries.length} models loaded, ${this.errors.length} failed`);
  }

  load(key, path) {
    if (this.cache.has(key)) return Promise.resolve(this.cache.get(key));
    if (this.pending.has(key)) return this.pending.get(key);

    const promise = new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          const asset = { scene: gltf.scene, animations: gltf.animations || [] };
          this.cache.set(key, asset);
          this.pending.delete(key);
          resolve(asset);
        },
        undefined,
        (error) => {
          this.pending.delete(key);
          this.errors.push({ key, path, error: error.message || error });
          console.warn(`AssetManager: Failed to load "${key}" from ${path}`);
          reject(error);
        }
      );
    });

    this.pending.set(key, promise);
    return promise;
  }

  getModel(key) {
    const asset = this.cache.get(key);
    if (!asset) return null;
    const clone = asset.scene.clone(true);
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
      }
    });
    return clone;
  }

  getScaledModel(key) {
    const clone = this.getModel(key);
    if (!clone) return null;
    const info = AssetManager.MANIFEST[key];
    if (info && info.targetSize) {
      this.scaleToFit(clone, info.targetSize);
    }
    // Center on X/Z and ground at Y=0
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    if (box.min.x !== Infinity) {
      const center = box.getCenter(new THREE.Vector3());
      clone.position.set(-center.x, -box.min.y, -center.z);
    }
    return clone;
  }

  has(key) {
    return this.cache.has(key);
  }

  scaleToFit(model, targetSize) {
    if (!model) return;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      model.scale.setScalar(targetSize / maxDim);
    }
  }
}

// Singleton instance
export const assetManager = new AssetManager();
