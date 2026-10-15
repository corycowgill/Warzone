import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

/**
 * Create a 3-step cel-shading gradient ramp texture for MeshToonMaterial.
 * Returns a shared texture (call once, reuse everywhere).
 */
function createToonGradientMap() {
  // 4-pixel wide ramp: dark shadow, mid tone, bright highlight, full bright
  const colors = new Uint8Array([40, 100, 180, 255]);
  const gradientMap = new THREE.DataTexture(colors, colors.length, 1, THREE.RedFormat);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;
  return gradientMap;
}

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
    this.toonGradientMap = createToonGradientMap();
    this.toonEnabled = true; // Global toggle for toon shading
  }

  static MANIFEST = {
    // --- Environment ---
    tree_default:  { path: 'assets/models/environment/warzone-original/tree-broadleaf.glb', shading: 'standard',  targetSize: 4.0 },
    tree_oak:      { path: 'assets/models/environment/warzone-original/tree-oak.glb', shading: 'standard',      targetSize: 4.5 },
    tree_cone:     { path: 'assets/models/environment/warzone-original/tree-pine.glb', shading: 'standard',     targetSize: 4.0 },
    tree_detailed: { path: 'assets/models/environment/warzone-original/tree-birch.glb', shading: 'standard', targetSize: 4.0 },
    tree_fat:      { path: 'assets/models/environment/warzone-original/tree-fir.glb', shading: 'standard',      targetSize: 4.5 },
    tree_palm:     { path: 'assets/models/environment/warzone-original/tree-palm.glb', shading: 'standard',     targetSize: 4.0 },

    // --- Original authored unit roster ---
    unit_infantry: { path: 'assets/models/units/warzone-original/infantry.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 2.0 },
    unit_engineer: { path: 'assets/models/units/warzone-original/engineer.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 2.0 },
    unit_tank: { path: 'assets/models/units/warzone-original/tank.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 3.5 },
    unit_heavytank: { path: 'assets/models/units/warzone-original/heavy-tank.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 4.5 },
    unit_scoutcar: { path: 'assets/models/units/warzone-original/scoutcar.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 3.0 },
    unit_apc: { path: 'assets/models/units/warzone-original/apc.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 3.5 },
    unit_aahalftrack: { path: 'assets/models/units/warzone-original/aahalftrack.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 3.0 },
    unit_spg: { path: 'assets/models/units/warzone-original/spg.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 3.5 },
    unit_mortarteam: { path: 'assets/models/units/warzone-original/mortarteam.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 2.5 },
    unit_commander: { path: 'assets/models/units/warzone-original/commander.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 2.5 },
    unit_drone: { path: 'assets/models/units/warzone-original/drone.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 2.0 },
    unit_plane: { path: 'assets/models/units/warzone-original/plane.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 4.0 },
    unit_bomber: { path: 'assets/models/units/warzone-original/bomber.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 5.0 },
    unit_battleship: { path: 'assets/models/units/warzone-original/battleship.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 5.0, waterline: 0.035 },
    unit_destroyer: { path: 'assets/models/units/warzone-original/destroyer.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 4.5, waterline: 0.035 },
    unit_submarine: { path: 'assets/models/units/warzone-original/submarine.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 4.0, waterline: 0.035 },
    unit_patrolboat: { path: 'assets/models/units/warzone-original/patrolboat.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 3.0, waterline: 0.035 },
    unit_carrier: { path: 'assets/models/units/warzone-original/carrier.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 6.0, waterline: 0.035 },

    // --- Buildings (military-themed: hangars, fortifications, industrial) ---
    bld_headquarters: { path: 'assets/models/buildings/warzone-original/headquarters.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 8.0 },
    bld_barracks: { path: 'assets/models/buildings/warzone-original/barracks.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 5.0 },
    bld_warfactory: { path: 'assets/models/buildings/warzone-original/warfactory.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 6.0 },
    bld_shipyard: { path: 'assets/models/buildings/warzone-original/shipyard.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 6.0 },
    bld_airfield: { path: 'assets/models/buildings/warzone-original/airfield.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 6.0 },
    bld_turret: { path: 'assets/models/buildings/warzone-original/turret.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 3.0 },
    bld_aaturret: { path: 'assets/models/buildings/warzone-original/aaturret.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 3.0 },
    bld_bunker: { path: 'assets/models/buildings/warzone-original/bunker.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 4.0 },
    bld_wall: { path: 'assets/models/buildings/warzone-original/wall.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 3.0 },
    bld_supplydepot: { path: 'assets/models/buildings/warzone-original/supplydepot.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 4.0 },
    bld_supplyexchange: { path: 'assets/models/buildings/warzone-original/supplyexchange.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 5.0 },
    bld_resourcedepot: { path: 'assets/models/buildings/warzone-original/resourcedepot.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 4.0 },
    bld_techlab: { path: 'assets/models/buildings/warzone-original/techlab.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 5.0 },
    bld_superweapon: { path: 'assets/models/buildings/warzone-original/superweapon.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 6.0 },
    bld_munitionscache: { path: 'assets/models/buildings/warzone-original/munitionscache.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 3.0 },
    bld_ditch: { path: 'assets/models/buildings/warzone-original/ditch.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 3.0 },
    bld_shippingport: { path: 'assets/models/buildings/warzone-original/shippingport.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 5.0 },
    bld_watchtower: { path: 'assets/models/buildings/warzone-original/watchtower.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 5.0 },

    // Capturable battlefield structures.
    bld_abandonedfactory: { path: 'assets/models/buildings/warzone-original/abandonedfactory.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 6.0 },
    bld_commrelay: { path: 'assets/models/buildings/warzone-original/commrelay.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 5.0 },
    bld_repairbay: { path: 'assets/models/buildings/warzone-original/repairbay.glb', teamMaterial: 'TeamColor', shading: 'standard', targetSize: 5.0 },

    // Original terrain dressing, batched by material at placement time.
    env_boulder: { path: 'assets/models/environment/warzone-original/boulder.glb', shading: 'standard', targetSize: 2.5 },
    env_cliff: { path: 'assets/models/environment/warzone-original/cliff.glb', shading: 'standard', targetSize: 5 },
    env_mountain: { path: 'assets/models/environment/warzone-original/mountain.glb', shading: 'standard', targetSize: 16 },
    env_grass: { path: 'assets/models/environment/warzone-original/grass.glb', shading: 'standard', targetSize: 1.2 },
    env_reeds: { path: 'assets/models/environment/warzone-original/reeds.glb', shading: 'standard', targetSize: 2 },
    env_bush: { path: 'assets/models/environment/warzone-original/bush.glb', shading: 'standard', targetSize: 2 },
    env_stump: { path: 'assets/models/environment/warzone-original/stump.glb', shading: 'standard', targetSize: 1 },
    env_fallen_log: { path: 'assets/models/environment/warzone-original/fallen-log.glb', shading: 'standard', targetSize: 3 },
    env_resource_outcrop: { path: 'assets/models/environment/warzone-original/resource-outcrop.glb', shading: 'standard', targetSize: 3 },
    env_supply_cache: { path: 'assets/models/environment/warzone-original/supply-cache.glb', shading: 'standard', targetSize: 2 },

    // --- Environment Props (for map decoration and neutral structures) ---
    prop_generator:       { path: 'assets/models/environment/warzone-original/prop-generator.glb', shading: 'standard',           targetSize: 2.0 },
    prop_wireless:        { path: 'assets/models/environment/warzone-original/prop-wireless.glb', shading: 'standard',            targetSize: 2.0 },
    prop_barrel_machine:  { path: 'assets/models/environment/warzone-original/prop-barrel-machine.glb', shading: 'standard',              targetSize: 1.5 },
    prop_rocket_fuel:     { path: 'assets/models/environment/warzone-original/prop-rocket-fuel.glb', shading: 'standard',                targetSize: 2.0 },
    prop_hangar_round:    { path: 'assets/models/environment/warzone-original/prop-hangar-round.glb', shading: 'standard',               targetSize: 4.0 },
    prop_wood_structure:  { path: 'assets/models/environment/warzone-original/prop-wood-structure.glb', shading: 'standard',       targetSize: 3.0 },
    prop_rocks_large:     { path: 'assets/models/environment/warzone-original/prop-rocks-large.glb', shading: 'standard',   targetSize: 2.0 },
    prop_rocks:           { path: 'assets/models/environment/warzone-original/prop-rocks.glb', shading: 'standard',         targetSize: 1.5 },
    prop_weapon_cannon:   { path: 'assets/models/environment/warzone-original/prop-weapon-cannon.glb', shading: 'standard',        targetSize: 3.0 },
    prop_weapon_turret:   { path: 'assets/models/environment/warzone-original/prop-weapon-turret.glb', shading: 'standard',        targetSize: 3.0 },
  };

  async preloadAll() {
    const entries = Object.entries(AssetManager.MANIFEST);
    const promises = entries.map(([key, info]) => this.load(key, info.path));
    await Promise.allSettled(promises);
    this.ready = true;
    console.log(`AssetManager: ${this.cache.size}/${entries.length} models loaded, ${this.errors.length} failed`);
    if (this.errors.length > 0) {
      console.warn('AssetManager failed models:', this.errors.map(e => `${e.key}: ${e.path}`).join(', '));
    }
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

    // Check if the scene contains SkinnedMesh (rigged models like Quaternius characters)
    let hasSkinnedMesh = false;
    asset.scene.traverse((child) => {
      if (child.isSkinnedMesh) hasSkinnedMesh = true;
    });

    let clone;
    if (hasSkinnedMesh) {
      // skeletonClone properly rebinds skeleton bones to cloned mesh
      try {
        clone = skeletonClone(asset.scene);
      } catch (e) {
        console.warn(`AssetManager: skeletonClone failed for "${key}", using fallback`, e);
        clone = asset.scene.clone(true);
      }

      // Convert SkinnedMesh to regular Mesh for RTS use (no skeletal animation needed)
      // This avoids skeleton binding issues and improves performance
      const skinnedToReplace = [];
      clone.traverse((child) => {
        if (child.isSkinnedMesh) {
          skinnedToReplace.push(child);
        }
      });
      for (const skinned of skinnedToReplace) {
        // Bake the current pose into a regular Mesh
        const mesh = new THREE.Mesh(skinned.geometry, skinned.material);
        mesh.name = skinned.name;
        mesh.position.copy(skinned.position);
        mesh.rotation.copy(skinned.rotation);
        mesh.scale.copy(skinned.scale);
        mesh.castShadow = skinned.castShadow;
        mesh.receiveShadow = skinned.receiveShadow;
        mesh.visible = skinned.visible;
        if (skinned.parent) {
          skinned.parent.add(mesh);
          skinned.parent.remove(skinned);
        }
      }
    } else {
      clone = asset.scene.clone(true);
    }

    // Clone materials so each instance gets its own (for team tinting)
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => m.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });
    return clone;
  }

  getScaledModel(key) {
    const clone = this.getModel(key);
    if (!clone) return null;

    // Verify the clone has renderable meshes
    let meshCount = 0;
    clone.traverse((child) => {
      if (child.isMesh) meshCount++;
    });
    if (meshCount === 0) {
      console.warn(`AssetManager: model "${key}" has no meshes after cloning`);
      return null;
    }

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

    // Safety: verify model has reasonable size after scaling
    const scaledBox = new THREE.Box3().setFromObject(clone);
    const size = scaledBox.getSize(new THREE.Vector3());
    if (size.x < 0.01 && size.y < 0.01 && size.z < 0.01) {
      console.warn(`AssetManager: model "${key}" scaled to near-zero size (${size.x.toFixed(4)}, ${size.y.toFixed(4)}, ${size.z.toFixed(4)}), falling back to procedural`);
      return null;
    }

    // Retain the intended waterline and PBR response throughout entity creation.
    if (info?.waterline) clone.position.y -= info.waterline * info.targetSize;
    if (info?.shading === 'standard') {
      clone.traverse(child => {
        if (!child.isMesh) return;
        for (const material of (Array.isArray(child.material) ? child.material : [child.material])) {
          material.userData.preservePBR = true;
        }
      });
    }
    clone.userData.assetKey = key;

    // Detailed roster keeps authored roughness and metal response.
    if (info?.shading !== 'standard') this.applyToonShading(clone);

    return clone;
  }

  has(key) {
    return this.cache.has(key);
  }

  /**
   * Get a scaled model with team color tinting applied.
   * Replaces the dominant color on model meshes with the team color.
   */
  getTeamTintedModel(key, team) {
    const clone = this.getScaledModel(key);
    if (!clone) return null;

    // Differentiate unit vs building tinting:
    // Units get bright team colors, buildings get muted/structural colors with team accent
    const isBuilding = key.startsWith('bld_');

    const teamColor = team === 'player'
      ? new THREE.Color(0x4488ff)
      : new THREE.Color(team === 'neutral' ? 0x8d9586 : 0xcc4444);  // Slightly darker red so it doesn't clash

    // Building colors: more structural gray/brown with subtle team accent
    const buildingBase = new THREE.Color(0x888877);  // Neutral gray-tan
    const buildingAccent = team === 'player'
      ? new THREE.Color(0x3366aa)
      : new THREE.Color(0x994433);  // Dark brownish-red for enemy buildings

    // Brighter team colors for unit visibility
    const teamColorBright = team === 'player'
      ? new THREE.Color(0x6699ff)
      : new THREE.Color(0xff6666);

    // Authored models identify paint explicitly; preserve tracks, optics and steel.
    const teamMaterial = AssetManager.MANIFEST[key]?.teamMaterial;
    const tintMaterial = (mat) => {
      if (!mat || !mat.color) return;
      if (teamMaterial) {
        if (mat.name === teamMaterial) mat.color.copy(teamColor);
        return;
      }

      // Choose tint colors based on entity type
      const tintColor = isBuilding ? buildingAccent : teamColor;
      const tintBright = isBuilding ? buildingBase : teamColorBright;

      if (mat.isMeshStandardMaterial) {
        const hsl = {};
        mat.color.getHSL(hsl);

        if (isBuilding) {
          // Buildings: structural gray/tan base with subtle team accent
          if (hsl.l < 0.2) {
            mat.color.copy(buildingBase);  // Neutral gray instead of team color
          } else if (hsl.l < 0.5) {
            mat.color.multiplyScalar(2.0);
            mat.color.lerp(buildingBase, 0.4);
          } else {
            mat.color.lerp(buildingAccent, 0.15);  // Subtle team accent only
          }
        } else {
          // Units: bright team colors for visibility
          if (hsl.l < 0.2) {
            mat.color.copy(teamColor);
            mat.color.multiplyScalar(1.5);
          } else if (hsl.l < 0.5) {
            mat.color.multiplyScalar(2.0);
            mat.color.lerp(teamColorBright, 0.3);
          } else {
            mat.color.lerp(teamColor, 0.2);
          }
        }

        // Reduce metalness (causes darkness without env map) and increase roughness
        if (mat.metalness !== undefined) mat.metalness = Math.min(mat.metalness, 0.1);
        if (mat.roughness !== undefined) mat.roughness = Math.max(mat.roughness, 0.6);

        // Add emissive for visibility - subtle for buildings, stronger for units
        if (mat.emissive) {
          mat.emissive.copy(tintColor).multiplyScalar(isBuilding ? 0.05 : 0.1);
        }
      } else {
        // Non-PBR material
        const hsl = {};
        mat.color.getHSL(hsl);
        if (hsl.l < 0.2) {
          mat.color.copy(isBuilding ? buildingBase : teamColor);
        } else {
          mat.color.lerp(tintColor, isBuilding ? 0.15 : 0.25);
        }
      }

      // If material has a texture map, preserve it
      if (mat.map) {
        mat.color.setRGB(1, 1, 1);
        if (mat.emissive) {
          mat.emissive.copy(tintColor).multiplyScalar(0.1);
        }
      }
    };

    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (Array.isArray(child.material)) {
          child.material.forEach(tintMaterial);
        } else {
          tintMaterial(child.material);
        }
      }
    });

    // Other assets retain the established cel-shaded look.
    if (AssetManager.MANIFEST[key]?.shading !== 'standard') this.applyToonShading(clone);

    return clone;
  }

  /**
   * Convert a MeshStandardMaterial (or any material) to MeshToonMaterial
   * for cel-shaded look. Preserves color, map, emissive, and transparency.
   */
  _toToonMaterial(mat) {
    if (!mat || mat.isMeshToonMaterial || mat.userData?.preservePBR) return mat;

    const toon = new THREE.MeshToonMaterial({
      color: mat.color ? mat.color.clone() : new THREE.Color(0xffffff),
      map: mat.map || null,
      gradientMap: this.toonGradientMap,
      emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000),
      emissiveIntensity: mat.emissiveIntensity || 0,
      emissiveMap: mat.emissiveMap || null,
      normalMap: mat.normalMap || null,
      side: mat.side !== undefined ? mat.side : THREE.FrontSide,
      transparent: mat.transparent || false,
      opacity: mat.opacity !== undefined ? mat.opacity : 1.0,
      alphaTest: mat.alphaTest || 0,
    });

    // Preserve name for debugging
    toon.name = mat.name || '';
    // Copy userData if present
    if (mat.userData) toon.userData = mat.userData;

    return toon;
  }

  /**
   * Apply toon shading to all meshes in a model clone.
   */
  applyToonShading(clone) {
    if (!this.toonEnabled || !clone) return clone;
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => this._toToonMaterial(m));
        } else {
          child.material = this._toToonMaterial(child.material);
        }
      }
    });
    return clone;
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
