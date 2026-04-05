import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

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

    // --- Units (Poly Pizza military models by Zsky, Quaternius, KolosStudios, etc.) ---
    unit_infantry:        { path: 'assets/models/units/quaternius/soldier-quaternius.glb',    targetSize: 2.0 },  // CC0 Quaternius soldier
    unit_engineer:        { path: 'assets/models/units/quaternius/swat-quaternius.glb',     targetSize: 2.0 },  // CC0 Quaternius SWAT
    unit_tank:            { path: 'assets/models/units/mreliptik-tank/GREEN/tank_1_green.glb', targetSize: 3.5 },  // CC0 MrEliptik stylized tank
    unit_heavytank:       { path: 'assets/models/units/poly-pizza/light-tank-zsky.glb',     targetSize: 4.5 },
    unit_scoutcar:        { path: 'assets/models/units/poly-pizza/jeep-zsky.glb',           targetSize: 3.0 },
    unit_apc:             { path: 'assets/models/units/poly-pizza/truck-zsky.glb',          targetSize: 3.5 },
    unit_aahalftrack:     { path: 'assets/models/units/poly-pizza/ambulance-zsky.glb',      targetSize: 3.0 },
    unit_spg:             { path: 'assets/models/units/cannon-mobile.glb',                  targetSize: 3.5 },
    unit_mortarteam:      { path: 'assets/models/buildings/ithappy-military/Separate_assets_glb/mortar_001.glb', targetSize: 2.5 },  // ITHappy mortar
    unit_commander:       { path: 'assets/models/units/poly-pizza/military-man.glb',        targetSize: 2.5 },
    unit_drone:           { path: 'assets/models/units/poly-pizza/helicopter-zsky.glb',     targetSize: 2.0 },
    unit_plane:           { path: 'assets/models/units/poly-pizza/jet-google.glb',          targetSize: 4.0 },
    unit_bomber:          { path: 'assets/models/units/poly-pizza/airplane-google.glb',     targetSize: 5.0 },
    unit_battleship:      { path: 'assets/models/units/poly-pizza/battleship-catalano.glb', targetSize: 5.0 },
    unit_destroyer:       { path: 'assets/models/units/poly-pizza/simple-battleship.glb',   targetSize: 4.5 },
    unit_submarine:       { path: 'assets/models/units/psx-submarine/psx_sub_free.glb',     targetSize: 4.0 },  // BlenderVoyage PSX submarine
    unit_patrolboat:      { path: 'assets/models/units/poly-pizza/military-boat-zsky.glb',  targetSize: 3.0 },
    unit_carrier:         { path: 'assets/models/units/poly-pizza/ship-quaternius.glb',     targetSize: 6.0 },

    // --- Buildings (military-themed: hangars, fortifications, industrial) ---
    bld_headquarters:     { path: 'assets/models/buildings/fortress.glb',                          targetSize: 8.0 },  // Large military compound
    bld_barracks:         { path: 'assets/models/buildings/barracks.glb',                          targetSize: 5.0 },  // Military barracks
    bld_warfactory:       { path: 'assets/models/units/space-kit/hangar_largeB.glb',               targetSize: 6.0 },  // Industrial hangar for vehicles
    bld_shipyard:         { path: 'assets/models/buildings/dock.glb',                              targetSize: 6.0 },  // Naval dock
    bld_airfield:         { path: 'assets/models/units/space-kit/hangar_largeA.glb',               targetSize: 6.0 },  // Aircraft hangar
    bld_turret:           { path: 'assets/models/units/space-kit/turret_double.glb',               targetSize: 3.0 },  // Weapon turret
    bld_aaturret:         { path: 'assets/models/units/space-kit/turret_single.glb',               targetSize: 3.0 },  // AA gun emplacement
    bld_bunker:           { path: 'assets/models/buildings/poly-pizza/sack-trench-quaternius.glb',  targetSize: 4.0 },  // Sandbag fortification
    bld_wall:             { path: 'assets/models/buildings/poly-pizza/barrier-kolos.glb',           targetSize: 3.0 },  // Barrier/barricade
    bld_supplydepot:      { path: 'assets/models/buildings/storage.glb',                           targetSize: 4.0 },  // Supply storage
    bld_supplyexchange:   { path: 'assets/models/buildings/shipping-port.glb',                     targetSize: 5.0 },  // Industrial port/trade
    bld_resourcedepot:    { path: 'assets/models/units/space-kit/hangar_smallA.glb',               targetSize: 4.0 },  // Small resource hangar
    bld_techlab:          { path: 'assets/models/units/space-kit/structure_detailed.glb',           targetSize: 5.0 },  // Research/tech structure
    bld_superweapon:      { path: 'assets/models/units/space-kit/rocket_baseA.glb',                targetSize: 6.0 },  // Rocket launch base
    bld_munitionscache:   { path: 'assets/models/buildings/ithappy-military/Separate_assets_glb/barrel_001.glb', targetSize: 3.0 },  // ITHappy military barrel
    bld_ditch:            { path: 'assets/models/buildings/fence-fortified.glb',                    targetSize: 3.0 },  // Fortified trench
    bld_shippingport:     { path: 'assets/models/buildings/shipping-port.glb',                     targetSize: 5.0 },  // Port structure
    bld_watchtower:       { path: 'assets/models/buildings/ithappy-military/Separate_assets_glb/tower_001.glb', targetSize: 5.0 },  // ITHappy military tower

    // --- Environment Props (for map decoration and neutral structures) ---
    prop_generator:       { path: 'assets/models/units/space-kit/machine_generator.glb',           targetSize: 2.0 },
    prop_wireless:        { path: 'assets/models/units/space-kit/machine_wireless.glb',            targetSize: 2.0 },
    prop_barrel_machine:  { path: 'assets/models/units/space-kit/machine_barrel.glb',              targetSize: 1.5 },
    prop_rocket_fuel:     { path: 'assets/models/units/space-kit/rocket_fuelA.glb',                targetSize: 2.0 },
    prop_hangar_round:    { path: 'assets/models/units/space-kit/hangar_roundA.glb',               targetSize: 4.0 },
    prop_wood_structure:  { path: 'assets/models/buildings/tower-defense/wood-structure.glb',       targetSize: 3.0 },
    prop_rocks_large:     { path: 'assets/models/buildings/tower-defense/detail-rocks-large.glb',   targetSize: 2.0 },
    prop_rocks:           { path: 'assets/models/buildings/tower-defense/detail-rocks.glb',         targetSize: 1.5 },
    prop_weapon_cannon:   { path: 'assets/models/buildings/tower-defense/weapon-cannon.glb',        targetSize: 3.0 },
    prop_weapon_turret:   { path: 'assets/models/buildings/tower-defense/weapon-turret.glb',        targetSize: 3.0 },
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
      : new THREE.Color(0xcc4444);  // Slightly darker red so it doesn't clash

    // Building colors: more structural gray/brown with subtle team accent
    const buildingBase = new THREE.Color(0x888877);  // Neutral gray-tan
    const buildingAccent = team === 'player'
      ? new THREE.Color(0x3366aa)
      : new THREE.Color(0x994433);  // Dark brownish-red for enemy buildings

    // Brighter team colors for unit visibility
    const teamColorBright = team === 'player'
      ? new THREE.Color(0x6699ff)
      : new THREE.Color(0xff6666);

    const tintMaterial = (mat) => {
      if (!mat || !mat.color) return;

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
