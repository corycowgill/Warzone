import * as THREE from 'three';

/**
 * InstancedRenderer - Batches entities sharing geometry+material into InstancedMesh
 * draw calls, massively reducing GPU overhead.
 *
 * Instead of each entity having 20-60 individual meshes (2000-6000 draw calls for
 * 100 entities), this system groups identical geometry+material pairs into single
 * InstancedMesh objects, targeting ~50-100 draw calls total.
 *
 * Usage:
 *   const renderer = new InstancedRenderer(scene, camera);
 *   renderer.registerEntityType('tank', templateGroup); // register once per type
 *   renderer.addEntity(entity);   // entity.type must be registered
 *   renderer.removeEntity(entity);
 *   renderer.update();            // call each frame
 */

// Default max instances per batch - will grow dynamically if exceeded
const DEFAULT_BATCH_CAPACITY = 128;

// Scratch objects reused every frame to avoid allocations
const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _color = new THREE.Color();
const _frustum = new THREE.Frustum();
const _projScreenMatrix = new THREE.Matrix4();
const _sphere = new THREE.Sphere();
const _center = new THREE.Vector3();

/**
 * A MeshBatch represents one InstancedMesh for a specific geometry+material pair.
 * Multiple entities of the same type share the same batch.
 */
class MeshBatch {
  /**
   * @param {THREE.BufferGeometry} geometry - Shared geometry
   * @param {THREE.Material} material - Shared material
   * @param {THREE.Vector3} localPosition - Offset within the entity group
   * @param {THREE.Quaternion} localRotation - Rotation within the entity group
   * @param {THREE.Vector3} localScale - Scale within the entity group
   * @param {number} capacity - Initial max instances
   */
  constructor(geometry, material, localPosition, localRotation, localScale, capacity) {
    this.geometry = geometry;
    this.material = material.clone();
    this.localPosition = localPosition.clone();
    this.localRotation = localRotation.clone();
    this.localScale = localScale.clone();
    this.capacity = capacity;
    this.activeCount = 0;

    // Entity ID -> slot index
    this.entitySlots = new Map();
    // Slot index -> entity ID (for swapping on removal)
    this.slotEntities = new Map();
    // Free list of available slots
    this.freeSlots = [];

    // Create the InstancedMesh
    this.instancedMesh = this._createInstancedMesh(capacity);

    // Per-instance team color attribute
    this.colorArray = new Float32Array(capacity * 3);
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(this.colorArray, 3);

    // Per-instance visibility (for frustum culling - hidden by zero-scaling)
    this.visible = new Uint8Array(capacity);
    this.visible.fill(1);

    // Bounding radius for frustum culling per instance
    this.boundingRadius = 0;
    if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
    if (geometry.boundingSphere) {
      this.boundingRadius = geometry.boundingSphere.radius *
        Math.max(localScale.x, localScale.y, localScale.z);
    }
  }

  _createInstancedMesh(capacity) {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    mesh.count = 0; // Start with 0 visible instances
    mesh.frustumCulled = false; // We handle culling per-instance
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Initialize all matrices to identity
    const identity = new THREE.Matrix4();
    for (let i = 0; i < capacity; i++) {
      mesh.setMatrixAt(i, identity);
    }
    mesh.instanceMatrix.needsUpdate = true;

    return mesh;
  }

  /**
   * Grow the batch if capacity is exceeded
   */
  _grow() {
    const oldCapacity = this.capacity;
    const newCapacity = oldCapacity * 2;

    // Create new InstancedMesh with doubled capacity
    const newMesh = this._createInstancedMesh(newCapacity);

    // Copy existing matrices
    for (let i = 0; i < this.activeCount; i++) {
      const m = new THREE.Matrix4();
      this.instancedMesh.getMatrixAt(i, m);
      newMesh.setMatrixAt(i, m);
    }

    // Copy existing colors
    const newColorArray = new Float32Array(newCapacity * 3);
    newColorArray.set(this.colorArray);
    this.colorArray = newColorArray;
    newMesh.instanceColor = new THREE.InstancedBufferAttribute(this.colorArray, 3);

    // Copy visibility
    const newVisible = new Uint8Array(newCapacity);
    newVisible.set(this.visible);
    this.visible = newVisible;

    // Replace mesh in scene
    const parent = this.instancedMesh.parent;
    if (parent) {
      parent.remove(this.instancedMesh);
      parent.add(newMesh);
    }

    // Dispose old
    this.instancedMesh.dispose();
    this.instancedMesh = newMesh;
    this.capacity = newCapacity;
  }

  /**
   * Allocate a slot for an entity. Returns slot index.
   */
  allocateSlot(entityId) {
    if (this.entitySlots.has(entityId)) {
      return this.entitySlots.get(entityId);
    }

    // Grow if needed
    if (this.activeCount >= this.capacity) {
      this._grow();
    }

    let slot;
    if (this.freeSlots.length > 0) {
      slot = this.freeSlots.pop();
    } else {
      slot = this.activeCount;
    }

    this.entitySlots.set(entityId, slot);
    this.slotEntities.set(slot, entityId);
    this.activeCount++;
    this.instancedMesh.count = this.activeCount;
    this.visible[slot] = 1;

    return slot;
  }

  /**
   * Free a slot. Uses swap-and-pop to keep instances packed.
   */
  freeSlot(entityId) {
    if (!this.entitySlots.has(entityId)) return;

    const slot = this.entitySlots.get(entityId);
    const lastSlot = this.activeCount - 1;

    if (slot !== lastSlot) {
      // Swap the last active instance into this slot
      const lastEntityId = this.slotEntities.get(lastSlot);

      // Copy matrix from last to freed slot
      const m = new THREE.Matrix4();
      this.instancedMesh.getMatrixAt(lastSlot, m);
      this.instancedMesh.setMatrixAt(slot, m);

      // Copy color
      this.colorArray[slot * 3] = this.colorArray[lastSlot * 3];
      this.colorArray[slot * 3 + 1] = this.colorArray[lastSlot * 3 + 1];
      this.colorArray[slot * 3 + 2] = this.colorArray[lastSlot * 3 + 2];

      // Copy visibility
      this.visible[slot] = this.visible[lastSlot];

      // Update mappings for swapped entity
      this.entitySlots.set(lastEntityId, slot);
      this.slotEntities.set(slot, lastEntityId);
    }

    // Remove the freed entity's mappings
    this.entitySlots.delete(entityId);
    this.slotEntities.delete(lastSlot);

    this.activeCount--;
    this.instancedMesh.count = this.activeCount;
  }

  /**
   * Update the instance matrix for a given entity.
   * @param {number} entityId
   * @param {THREE.Vector3} worldPos - Entity world position
   * @param {THREE.Quaternion} worldQuat - Entity world rotation
   * @param {THREE.Vector3} worldScale - Entity world scale (usually 1,1,1)
   */
  updateInstance(entityId, worldPos, worldQuat, worldScale) {
    const slot = this.entitySlots.get(entityId);
    if (slot === undefined) return;

    // Compose: world transform * local offset
    // First apply entity world transform, then the local mesh offset
    _pos.copy(this.localPosition);
    _pos.applyQuaternion(worldQuat);
    _pos.multiply(worldScale);
    _pos.add(worldPos);

    _quat.copy(worldQuat).multiply(this.localRotation);

    _scale.copy(this.localScale).multiply(worldScale);

    _mat4.compose(_pos, _quat, _scale);
    this.instancedMesh.setMatrixAt(slot, _mat4);
  }

  /**
   * Set the team color for an entity instance
   */
  setColor(entityId, color) {
    const slot = this.entitySlots.get(entityId);
    if (slot === undefined) return;

    _color.set(color);
    this.colorArray[slot * 3] = _color.r;
    this.colorArray[slot * 3 + 1] = _color.g;
    this.colorArray[slot * 3 + 2] = _color.b;
  }

  /**
   * Mark updates as needing upload to GPU
   */
  flush() {
    if (this.activeCount > 0) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
      if (this.instancedMesh.instanceColor) {
        this.instancedMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  dispose() {
    this.instancedMesh.dispose();
    this.material.dispose();
    this.entitySlots.clear();
    this.slotEntities.clear();
  }
}


/**
 * EntityTypeTemplate stores the mesh decomposition for a registered entity type.
 * When an entity type is registered, its template THREE.Group is traversed and
 * each child mesh's geometry+material is recorded. These become the batches.
 */
class EntityTypeTemplate {
  constructor() {
    // Array of { geometry, material, localPosition, localRotation, localScale }
    this.meshParts = [];
  }
}


export class InstancedRenderer {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.enabled = true;

    // Registered entity type templates: typeName -> EntityTypeTemplate
    this.templates = new Map();

    // Batch key -> MeshBatch
    // Key format: "typeName:partIndex"
    this.batches = new Map();

    // Entity ID -> { typeName, worldPos, worldQuat, worldScale, teamColor }
    this.entities = new Map();

    // Track which entities need transform updates
    this._dirtyEntities = new Set();

    // Stats for debugging
    this.stats = {
      batchCount: 0,
      instanceCount: 0,
      drawCalls: 0
    };
  }

  /**
   * Register an entity type by providing a template THREE.Group.
   * The group is decomposed into individual geometry+material pairs.
   * The template mesh is NOT added to the scene - it's only used as a blueprint.
   *
   * @param {string} typeName - Unique name for this entity type (e.g. 'tank', 'infantry')
   * @param {THREE.Group} templateGroup - A THREE.Group containing the entity's meshes
   * @param {object} [options]
   * @param {boolean} [options.shareGeometry=true] - Share geometry references (faster but can't modify per-type)
   */
  registerEntityType(typeName, templateGroup, options = {}) {
    if (this.templates.has(typeName)) {
      console.warn(`InstancedRenderer: type "${typeName}" already registered, skipping`);
      return;
    }

    const shareGeometry = options.shareGeometry !== false;
    const template = new EntityTypeTemplate();

    // Traverse the template group and extract mesh parts
    templateGroup.updateMatrixWorld(true);
    const rootInverse = new THREE.Matrix4().copy(templateGroup.matrixWorld).invert();

    templateGroup.traverse((child) => {
      if (!child.isMesh) return;

      // Skip selection rings and health bars (they're handled separately)
      if (child === child.parent?.selectionRing) return;
      const parentName = child.parent?.constructor?.name || '';
      if (child.name === 'healthFill') return;

      // Get local-to-root transform
      const localMatrix = new THREE.Matrix4()
        .copy(child.matrixWorld)
        .premultiply(rootInverse);

      const pos = new THREE.Vector3();
      const rot = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      localMatrix.decompose(pos, rot, scl);

      template.meshParts.push({
        geometry: shareGeometry ? child.geometry : child.geometry.clone(),
        material: child.material,
        localPosition: pos,
        localRotation: rot,
        localScale: scl
      });
    });

    if (template.meshParts.length === 0) {
      console.warn(`InstancedRenderer: type "${typeName}" has no meshes to instance`);
      return;
    }

    this.templates.set(typeName, template);

    // Pre-create batches for this type
    template.meshParts.forEach((part, index) => {
      const batchKey = `${typeName}:${index}`;
      const batch = new MeshBatch(
        part.geometry,
        part.material,
        part.localPosition,
        part.localRotation,
        part.localScale,
        DEFAULT_BATCH_CAPACITY
      );
      this.batches.set(batchKey, batch);
      this.scene.add(batch.instancedMesh);
    });

    this.stats.batchCount = this.batches.size;
  }

  /**
   * Add an entity to instanced rendering.
   * The entity's existing mesh group will be hidden (not removed from scene),
   * and the instanced renderer will take over rendering.
   *
   * @param {Entity} entity - Must have .id, .type, .team, .mesh (THREE.Group)
   * @param {object} [options]
   * @param {number} [options.teamColor] - Override team color hex (default: auto from team)
   */
  addEntity(entity, options = {}) {
    if (!this.enabled) return;

    const typeName = entity.type;
    const template = this.templates.get(typeName);
    if (!template) {
      console.warn(`InstancedRenderer: type "${typeName}" not registered, cannot add entity ${entity.id}`);
      return;
    }

    if (this.entities.has(entity.id)) {
      return; // Already tracked
    }

    // Determine team color
    const teamColor = options.teamColor !== undefined
      ? options.teamColor
      : this._getTeamColor(entity.team);

    // Store entity data
    const entityData = {
      typeName,
      entity, // keep reference for position sync
      teamColor
    };
    this.entities.set(entity.id, entityData);

    // Allocate slots in each batch for this type
    template.meshParts.forEach((_, index) => {
      const batchKey = `${typeName}:${index}`;
      const batch = this.batches.get(batchKey);
      if (batch) {
        batch.allocateSlot(entity.id);
        batch.setColor(entity.id, teamColor);
      }
    });

    // Hide the entity's original mesh group (but keep it for selection/health bar)
    if (entity.mesh) {
      entity.mesh.traverse((child) => {
        if (child.isMesh && child !== entity.selectionRing &&
            !(entity.healthBar && child.parent === entity.healthBar)) {
          child.visible = false;
        }
      });
      // Mark as instanced so other systems know
      entity._instancedRendering = true;
    }

    this.stats.instanceCount = this.entities.size;
    this._dirtyEntities.add(entity.id);
  }

  /**
   * Remove an entity from instanced rendering.
   * Re-shows the entity's original mesh group.
   *
   * @param {Entity} entity
   */
  removeEntity(entity) {
    const entityData = this.entities.get(entity.id);
    if (!entityData) return;

    const template = this.templates.get(entityData.typeName);
    if (template) {
      template.meshParts.forEach((_, index) => {
        const batchKey = `${entityData.typeName}:${index}`;
        const batch = this.batches.get(batchKey);
        if (batch) {
          batch.freeSlot(entity.id);
        }
      });
    }

    // Re-show original mesh if entity is still alive (e.g., opting out)
    if (entity.mesh && entity.alive) {
      entity.mesh.traverse((child) => {
        if (child.isMesh) {
          child.visible = true;
        }
      });
      entity._instancedRendering = false;
    }

    this.entities.delete(entity.id);
    this._dirtyEntities.delete(entity.id);
    this.stats.instanceCount = this.entities.size;
  }

  /**
   * Update all instance transforms from entity positions.
   * Call once per frame.
   */
  update() {
    if (!this.enabled || this.entities.size === 0) return;

    // Build frustum for culling
    this.camera.updateMatrixWorld();
    _projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    _frustum.setFromProjectionMatrix(_projScreenMatrix);

    // Update all entity transforms
    for (const [entityId, data] of this.entities) {
      const entity = data.entity;
      if (!entity.mesh) continue;

      // Read position from the entity's mesh group (authoritative)
      const meshPos = entity.mesh.position;
      const meshQuat = entity.mesh.quaternion;
      const meshScale = entity.mesh.scale;

      // Frustum culling: check if entity center is in view
      // Use a generous bounding sphere based on entity type
      const inFrustum = this._isInFrustum(meshPos, data.typeName);

      const template = this.templates.get(data.typeName);
      if (!template) continue;

      template.meshParts.forEach((_, index) => {
        const batchKey = `${data.typeName}:${index}`;
        const batch = this.batches.get(batchKey);
        if (!batch) return;

        if (inFrustum) {
          batch.updateInstance(entityId, meshPos, meshQuat, meshScale);
        } else {
          // Move off-screen by setting a zero-scale matrix
          _mat4.makeScale(0, 0, 0);
          const slot = batch.entitySlots.get(entityId);
          if (slot !== undefined) {
            batch.instancedMesh.setMatrixAt(slot, _mat4);
          }
        }
      });
    }

    // Flush all batch updates to GPU
    let drawCalls = 0;
    for (const batch of this.batches.values()) {
      batch.flush();
      if (batch.activeCount > 0) drawCalls++;
    }
    this.stats.drawCalls = drawCalls;
  }

  /**
   * Check if a position is within the camera frustum (with padding).
   * @param {THREE.Vector3} position
   * @param {string} typeName
   * @returns {boolean}
   */
  _isInFrustum(position, typeName) {
    // Use a generous radius for the entity bounding sphere
    const radius = this._getEntityBoundingRadius(typeName);
    _sphere.center.copy(position);
    _sphere.radius = radius;
    return _frustum.intersectsSphere(_sphere);
  }

  /**
   * Get an approximate bounding radius for an entity type.
   * Cached after first computation.
   */
  _getEntityBoundingRadius(typeName) {
    if (this._boundingRadiusCache && this._boundingRadiusCache.has(typeName)) {
      return this._boundingRadiusCache.get(typeName);
    }
    if (!this._boundingRadiusCache) this._boundingRadiusCache = new Map();

    let maxRadius = 5; // Default
    const template = this.templates.get(typeName);
    if (template) {
      for (const part of template.meshParts) {
        const dist = part.localPosition.length() + (part.geometry.boundingSphere?.radius || 1) *
          Math.max(part.localScale.x, part.localScale.y, part.localScale.z);
        if (dist > maxRadius) maxRadius = dist;
      }
    }

    this._boundingRadiusCache.set(typeName, maxRadius);
    return maxRadius;
  }

  /**
   * Get team color as hex number
   */
  _getTeamColor(team) {
    return team === 'player' ? 0x3366ff : 0xff3333;
  }

  /**
   * Update the team color for an entity (e.g., after team change)
   */
  setEntityColor(entity, color) {
    const entityData = this.entities.get(entity.id);
    if (!entityData) return;

    entityData.teamColor = color;
    const template = this.templates.get(entityData.typeName);
    if (!template) return;

    template.meshParts.forEach((_, index) => {
      const batchKey = `${entityData.typeName}:${index}`;
      const batch = this.batches.get(batchKey);
      if (batch) {
        batch.setColor(entity.id, color);
      }
    });
  }

  /**
   * Check if an entity type is registered
   */
  hasType(typeName) {
    return this.templates.has(typeName);
  }

  /**
   * Check if an entity is being rendered by this system
   */
  hasEntity(entityId) {
    return this.entities.has(entityId);
  }

  /**
   * Get current rendering stats
   */
  getStats() {
    return {
      ...this.stats,
      batchCapacity: Array.from(this.batches.values()).reduce((sum, b) => sum + b.capacity, 0),
      registeredTypes: this.templates.size
    };
  }

  /**
   * Clean up all GPU resources
   */
  dispose() {
    for (const batch of this.batches.values()) {
      this.scene.remove(batch.instancedMesh);
      batch.dispose();
    }
    this.batches.clear();
    this.templates.clear();
    this.entities.clear();
    this._dirtyEntities.clear();
    if (this._boundingRadiusCache) this._boundingRadiusCache.clear();
  }
}
