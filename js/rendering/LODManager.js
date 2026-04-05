import * as THREE from 'three';

/**
 * LODManager - Level of Detail system for automatic model quality switching.
 * Reduces polygon count for distant entities to maintain frame rate.
 *
 * Three LOD levels:
 *   - HIGH: Full detail model (< 40 units from camera)
 *   - MEDIUM: Simplified model (40-100 units)
 *   - LOW: Billboard sprite or minimal geometry (> 100 units)
 */
export class LODManager {
  constructor(camera) {
    this.camera = camera;
    this.entities = new Map(); // entityId -> LODEntry
    this.updateInterval = 0.5; // seconds between LOD updates
    this.timeSinceUpdate = 0;

    // Distance thresholds
    this.thresholds = {
      high: 40,    // Full detail within 40 units
      medium: 100, // Medium detail within 100 units
      // Beyond 100 = low detail
    };

    // Reusable vector for distance calculations
    this._cameraPos = new THREE.Vector3();
    this._entityPos = new THREE.Vector3();
  }

  /**
   * Register an entity for LOD management
   * @param {string} id - Entity unique ID
   * @param {THREE.Group} meshGroup - The entity's mesh group
   * @param {Object} lodMeshes - { high: Group, medium: Group, low: Group }
   */
  register(id, meshGroup, lodMeshes = null) {
    this.entities.set(id, {
      group: meshGroup,
      lodMeshes: lodMeshes,
      currentLevel: 'high',
      lastDistance: 0,
    });
  }

  /**
   * Unregister an entity
   */
  unregister(id) {
    this.entities.delete(id);
  }

  /**
   * Update LOD levels based on camera distance.
   * Called each frame with delta time.
   */
  update(delta) {
    this.timeSinceUpdate += delta;
    if (this.timeSinceUpdate < this.updateInterval) return;
    this.timeSinceUpdate = 0;

    if (!this.camera) return;
    this._cameraPos.copy(this.camera.position);

    for (const [id, entry] of this.entities) {
      if (!entry.group || !entry.group.parent) continue;

      // Get entity world position
      entry.group.getWorldPosition(this._entityPos);
      const distance = this._cameraPos.distanceTo(this._entityPos);
      entry.lastDistance = distance;

      // Determine target LOD level
      let targetLevel;
      if (distance < this.thresholds.high) {
        targetLevel = 'high';
      } else if (distance < this.thresholds.medium) {
        targetLevel = 'medium';
      } else {
        targetLevel = 'low';
      }

      // Switch LOD if needed
      if (targetLevel !== entry.currentLevel) {
        this._switchLOD(entry, targetLevel);
        entry.currentLevel = targetLevel;
      }

      // Frustum culling: hide entities far beyond view
      if (distance > 300) {
        entry.group.visible = false;
      } else {
        entry.group.visible = true;
      }
    }
  }

  /**
   * Switch entity to a different LOD level
   */
  _switchLOD(entry, level) {
    if (!entry.lodMeshes) {
      // No LOD meshes - use simplified approach
      // At low LOD, reduce children visibility
      if (level === 'low') {
        const children = entry.group.children;
        // Hide decorative meshes (keep first 3-4 core meshes)
        for (let i = 0; i < children.length; i++) {
          if (i >= 3) children[i].visible = false;
        }
      } else if (level === 'medium') {
        const children = entry.group.children;
        // Show most meshes, hide finest details
        for (let i = 0; i < children.length; i++) {
          children[i].visible = i < Math.ceil(children.length * 0.7);
        }
      } else {
        // High - show all
        for (const child of entry.group.children) {
          child.visible = true;
        }
      }
      return;
    }

    // With LOD meshes, swap visibility
    for (const [lod, mesh] of Object.entries(entry.lodMeshes)) {
      if (mesh) mesh.visible = (lod === level);
    }
  }

  /**
   * Set LOD thresholds
   */
  setThresholds(high, medium) {
    this.thresholds.high = high;
    this.thresholds.medium = medium;
  }

  /**
   * Get stats for debugging
   */
  getStats() {
    let high = 0, medium = 0, low = 0, hidden = 0;
    for (const entry of this.entities.values()) {
      if (!entry.group?.visible) hidden++;
      else if (entry.currentLevel === 'high') high++;
      else if (entry.currentLevel === 'medium') medium++;
      else low++;
    }
    return { total: this.entities.size, high, medium, low, hidden };
  }

  dispose() {
    this.entities.clear();
  }
}
