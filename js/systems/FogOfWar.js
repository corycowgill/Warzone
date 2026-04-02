import * as THREE from 'three';
import { GAME_CONFIG, UNIT_STATS } from '../core/Constants.js';

/**
 * Fog of War system.
 * Three states per cell:
 *   0 = unexplored (black)
 *   1 = explored but not visible (grey/dark - remembers buildings but hides units)
 *   2 = currently visible (clear)
 *
 * Uses a grid matching the terrain mapSize (128x128).
 * Each frame, resets visible cells to explored, then marks cells within
 * friendly unit/building vision range as visible.
 * Renders as a translucent mesh overlay in the 3D scene.
 */
export class FogOfWar {
  constructor(game, team) {
    this.game = game;
    this.team = team; // which team this fog is for (typically 'player')
    this.mapSize = GAME_CONFIG.mapSize;         // 128
    this.worldSize = GAME_CONFIG.mapSize * GAME_CONFIG.worldScale; // 256
    this.cellSize = GAME_CONFIG.worldScale;     // 2

    // Fog grid: 0=unexplored, 1=explored, 2=visible
    this.grid = new Uint8Array(this.mapSize * this.mapSize);

    // Previous frame visibility for diffing (avoid texture upload every frame)
    this._dirtyFlag = true;

    // Fog overlay mesh
    this.fogTexture = null;
    this.fogMesh = null;
    this._textureData = null;

    // Track hidden enemy meshes
    this._hiddenEnemies = new Set();

    this.createFogOverlay();
  }

  createFogOverlay() {
    // Create a data texture for the fog
    const size = this.mapSize;
    const data = new Uint8Array(size * size * 4);
    // Initialize to fully black (unexplored)
    for (let i = 0; i < size * size; i++) {
      data[i * 4 + 0] = 0;   // R
      data[i * 4 + 1] = 0;   // G
      data[i * 4 + 2] = 0;   // B
      data[i * 4 + 3] = 255; // A - fully opaque = fully fogged
    }
    this._textureData = data;

    this.fogTexture = new THREE.DataTexture(
      data,
      size,
      size,
      THREE.RGBAFormat
    );
    this.fogTexture.magFilter = THREE.LinearFilter;
    this.fogTexture.minFilter = THREE.LinearFilter;
    this.fogTexture.needsUpdate = true;

    // Create a plane covering the entire map, positioned just above the terrain
    const geometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({
      map: this.fogTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.fogMesh = new THREE.Mesh(geometry, material);
    // Position at center of world, slightly above max terrain height
    this.fogMesh.position.set(this.worldSize / 2, 8, this.worldSize / 2);
    this.fogMesh.renderOrder = 999; // Render on top

    this.game.sceneManager.scene.add(this.fogMesh);
  }

  /**
   * Called each frame during PLAYING state.
   */
  update() {
    // Step 1: Demote all currently visible (2) cells to explored (1)
    const grid = this.grid;
    const len = grid.length;
    for (let i = 0; i < len; i++) {
      if (grid[i] === 2) {
        grid[i] = 1;
      }
    }

    // Step 2: Mark cells visible based on friendly unit/building positions
    const friendlyEntities = this.game.entities.filter(
      e => e.team === this.team && e.alive
    );

    for (const entity of friendlyEntities) {
      const pos = entity.getPosition();
      const gx = Math.floor(pos.x / this.cellSize);
      const gz = Math.floor(pos.z / this.cellSize);

      // Get vision range - units have it from stats, buildings get a default
      let visionRange;
      if (entity.isUnit) {
        visionRange = entity.vision || 10;
      } else if (entity.isBuilding) {
        visionRange = 12; // buildings have a decent vision range
      } else {
        visionRange = 8;
      }

      // Mark cells within vision radius
      const r = visionRange;
      const rSq = r * r;
      const minX = Math.max(0, gx - r);
      const maxX = Math.min(this.mapSize - 1, gx + r);
      const minZ = Math.max(0, gz - r);
      const maxZ = Math.min(this.mapSize - 1, gz + r);

      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - gx;
          const dz = z - gz;
          if (dx * dx + dz * dz <= rSq) {
            grid[z * this.mapSize + x] = 2; // visible
          }
        }
      }
    }

    // Step 3: Update the fog texture
    this.updateTexture();

    // Step 4: Show/hide enemy entities based on visibility
    this.updateEntityVisibility();
  }

  updateTexture() {
    const size = this.mapSize;
    const data = this._textureData;
    const grid = this.grid;

    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        const gridIdx = z * size + x;
        // Texture Y is flipped relative to world Z
        const texIdx = ((size - 1 - z) * size + x) * 4;
        const state = grid[gridIdx];

        if (state === 0) {
          // Unexplored: black, fully opaque
          data[texIdx + 0] = 0;
          data[texIdx + 1] = 0;
          data[texIdx + 2] = 0;
          data[texIdx + 3] = 230;
        } else if (state === 1) {
          // Explored: dark semi-transparent
          data[texIdx + 0] = 0;
          data[texIdx + 1] = 0;
          data[texIdx + 2] = 0;
          data[texIdx + 3] = 140;
        } else {
          // Visible: fully transparent
          data[texIdx + 0] = 0;
          data[texIdx + 1] = 0;
          data[texIdx + 2] = 0;
          data[texIdx + 3] = 0;
        }
      }
    }

    this.fogTexture.needsUpdate = true;
  }

  /**
   * Hide enemy entities that are not in visible cells.
   * Show enemy entities that ARE in visible cells.
   * Buildings in explored (but not visible) cells remain visible (RTS convention).
   */
  updateEntityVisibility() {
    const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
    const enemies = this.game.entities.filter(e => e.team === enemyTeam && e.alive);

    for (const entity of enemies) {
      const pos = entity.getPosition();
      const gx = Math.floor(pos.x / this.cellSize);
      const gz = Math.floor(pos.z / this.cellSize);

      // Clamp to grid bounds
      const cx = Math.max(0, Math.min(this.mapSize - 1, gx));
      const cz = Math.max(0, Math.min(this.mapSize - 1, gz));
      const state = this.grid[cz * this.mapSize + cx];

      if (state === 2) {
        // Visible - show
        if (entity.mesh) entity.mesh.visible = true;
        this._hiddenEnemies.delete(entity);
      } else if (state === 1 && entity.isBuilding) {
        // Explored, building - show (buildings are remembered)
        if (entity.mesh) entity.mesh.visible = true;
        this._hiddenEnemies.delete(entity);
      } else {
        // Hidden
        if (entity.mesh) entity.mesh.visible = false;
        this._hiddenEnemies.add(entity);
      }
    }
  }

  /**
   * Check if a grid cell is currently visible to this team.
   */
  isVisible(worldX, worldZ) {
    const gx = Math.floor(worldX / this.cellSize);
    const gz = Math.floor(worldZ / this.cellSize);
    if (gx < 0 || gx >= this.mapSize || gz < 0 || gz >= this.mapSize) return false;
    return this.grid[gz * this.mapSize + gx] === 2;
  }

  /**
   * Check if a grid cell has been explored.
   */
  isExplored(worldX, worldZ) {
    const gx = Math.floor(worldX / this.cellSize);
    const gz = Math.floor(worldZ / this.cellSize);
    if (gx < 0 || gx >= this.mapSize || gz < 0 || gz >= this.mapSize) return false;
    return this.grid[gz * this.mapSize + gx] >= 1;
  }

  /**
   * Get fog state at grid coords (for minimap).
   */
  getStateAtGrid(gx, gz) {
    if (gx < 0 || gx >= this.mapSize || gz < 0 || gz >= this.mapSize) return 0;
    return this.grid[gz * this.mapSize + gx];
  }

  /**
   * Clean up on game end/restart.
   */
  dispose() {
    if (this.fogMesh) {
      this.game.sceneManager.scene.remove(this.fogMesh);
      this.fogMesh.geometry.dispose();
      this.fogMesh.material.dispose();
    }
    if (this.fogTexture) {
      this.fogTexture.dispose();
    }
    // Restore visibility of all hidden enemies
    for (const entity of this._hiddenEnemies) {
      if (entity.mesh) entity.mesh.visible = true;
    }
    this._hiddenEnemies.clear();
  }
}
