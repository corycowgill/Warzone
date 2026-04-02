import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';

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
   * @param {number} [dt] - delta time in seconds (optional, defaults to 0.016)
   */
  update(dt) {
    const delta = dt || 0.016;

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

      // Day/night vision reduction (GD-071)
      if (entity.isUnit && this.game.sceneManager && this.game.sceneManager.getVisionMultiplier) {
        visionRange = Math.floor(visionRange * this.game.sceneManager.getVisionMultiplier(entity.type));
      }

      // Flare zones temporarily grant full vision (GD-066 smoke_screen/flare)
      if (this.game._flareZones) {
        for (const flare of this.game._flareZones) {
          const dx = pos.x - flare.position.x;
          const dz = pos.z - flare.position.z;
          if (dx * dx + dz * dz < flare.radius * flare.radius) {
            visionRange = Math.max(visionRange, entity.vision || 10); // restore full vision in flare area
          }
        }
      }

      // GD-078: Check if observer is in forest (observers in forest can see into forest)
      const terrain = this.game.terrain;
      const observerInForest = terrain && terrain.isInForest &&
        terrain.isInForest(pos.x, pos.z);

      // Mark cells within vision radius
      const r = visionRange;
      const rSq = r * r;
      // GD-078: Forest blocks vision - reduce effective radius into forest cells
      const forestReducedRSq = Math.floor(r * 0.6) * Math.floor(r * 0.6);
      const minX = Math.max(0, gx - r);
      const maxX = Math.min(this.mapSize - 1, gx + r);
      const minZ = Math.max(0, gz - r);
      const maxZ = Math.min(this.mapSize - 1, gz + r);

      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - gx;
          const dz = z - gz;
          const d2 = dx * dx + dz * dz;
          if (d2 <= rSq) {
            // GD-078: Forest cells harder to see into from outside
            if (!observerInForest && terrain && terrain._forestGrid &&
                terrain._forestGrid[z * this.mapSize + x] === 1) {
              // Only see into forest at reduced range
              if (d2 <= forestReducedRSq) {
                grid[z * this.mapSize + x] = 2;
              }
            } else {
              grid[z * this.mapSize + x] = 2; // visible
            }
          }
        }
      }
    }

    // Step 2a: Flare zones reveal area (GD-066)
    if (this.game._flareZones) {
      for (const flare of this.game._flareZones) {
        const fgx = Math.floor(flare.position.x / this.cellSize);
        const fgz = Math.floor(flare.position.z / this.cellSize);
        const fr = Math.ceil(flare.radius / this.cellSize);
        const frSq = fr * fr;
        const fMinX = Math.max(0, fgx - fr);
        const fMaxX = Math.min(this.mapSize - 1, fgx + fr);
        const fMinZ = Math.max(0, fgz - fr);
        const fMaxZ = Math.min(this.mapSize - 1, fgz + fr);
        for (let z = fMinZ; z <= fMaxZ; z++) {
          for (let x = fMinX; x <= fMaxX; x++) {
            const dx = x - fgx;
            const dz = z - fgz;
            if (dx * dx + dz * dz <= frSq) {
              grid[z * this.mapSize + x] = 2;
            }
          }
        }
      }
    }

    // Step 2a: Smoke zones block vision (GD-066)
    if (this.game._smokeZones) {
      for (const smoke of this.game._smokeZones) {
        const sgx = Math.floor(smoke.position.x / this.cellSize);
        const sgz = Math.floor(smoke.position.z / this.cellSize);
        const sr = Math.ceil(smoke.radius / this.cellSize);
        const srSq = sr * sr;
        const sMinX = Math.max(0, sgx - sr);
        const sMaxX = Math.min(this.mapSize - 1, sgx + sr);
        const sMinZ = Math.max(0, sgz - sr);
        const sMaxZ = Math.min(this.mapSize - 1, sgz + sr);
        for (let z = sMinZ; z <= sMaxZ; z++) {
          for (let x = sMinX; x <= sMaxX; x++) {
            const dx = x - sgx;
            const dz = z - sgz;
            if (dx * dx + dz * dz <= srSq) {
              if (grid[z * this.mapSize + x] === 2) {
                grid[z * this.mapSize + x] = 1; // demote visible to explored (blocked)
              }
            }
          }
        }
      }
    }

    // Step 2b: Sonar ping reveals (GD-070)
    for (const entity of this.game.entities) {
      if (!entity.alive || entity.team === this.team) continue;
      if (entity._sonarRevealed && entity._sonarRevealed > 0) {
        const epos = entity.getPosition();
        const egx = Math.floor(epos.x / this.cellSize);
        const egz = Math.floor(epos.z / this.cellSize);
        // Reveal small area around sonar-revealed entity
        for (let dz = -2; dz <= 2; dz++) {
          for (let dx = -2; dx <= 2; dx++) {
            const rx = egx + dx;
            const rz = egz + dz;
            if (rx >= 0 && rx < this.mapSize && rz >= 0 && rz < this.mapSize) {
              grid[rz * this.mapSize + rx] = 2;
            }
          }
        }
      }
    }

    // Step 2c: Firing position reveal - enemies that recently attacked become briefly visible
    this.updateCombatReveals(delta);

    // Step 3: Update the fog texture
    this.updateTexture();

    // Step 4: Show/hide enemy entities based on visibility
    this.updateEntityVisibility();
  }

  /**
   * Reveal enemies that are currently attacking (muzzle flash / firing visibility).
   * Gives a 2-second reveal window so players can react to being shot at from fog.
   */
  updateCombatReveals(delta) {
    for (const entity of this.game.entities) {
      if (entity.team === this.team || !entity.alive) continue;

      // Detect that the entity just fired (attackCooldown was just reset)
      if (entity.attackCooldown > 0 && entity.attackCooldown < 0.5) {
        entity._combatRevealTimer = 2.0;
      }

      // Tick down reveal timer
      if (entity._combatRevealTimer && entity._combatRevealTimer > 0) {
        entity._combatRevealTimer -= delta;
      }
    }
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
   * Units in explored-but-not-visible cells show as semi-transparent ghosts at last-known position.
   * Units with active combat reveal timers are shown regardless of fog state.
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

      // Check for combat reveal (firing from fog)
      const combatRevealed = entity._combatRevealTimer && entity._combatRevealTimer > 0;

      // GD-074: Stealthed submarines hidden even in visible areas
      if (entity.type === 'submarine' && entity.isStealthed && entity.isStealthed()) {
        if (entity.mesh) entity.mesh.visible = false;
        this._hiddenEnemies.add(entity);
        continue;
      }

      if (state === 2 || combatRevealed) {
        // Currently visible or combat-revealed - show
        if (entity.mesh) {
          entity.mesh.visible = true;
          // GD-074: Revealed submarines appear semi-transparent to enemies
          if (entity.type === 'submarine' && entity._stealthRevealTimer > 0) {
            this._setEntityOpacity(entity, 0.5);
          } else {
            this._restoreEntityOpacity(entity);
          }
        }
        // Record last-seen position while visible
        entity._lastSeenPosition = pos.clone();
        entity._lastSeenTime = Date.now();
        this._hiddenEnemies.delete(entity);
      } else if (state === 1 && entity.isBuilding) {
        // Explored, building - show (buildings are remembered)
        if (entity.mesh) {
          entity.mesh.visible = true;
          // Dim buildings in explored-but-not-visible areas
          this._setEntityOpacity(entity, 0.5);
        }
        entity._lastSeenPosition = pos.clone();
        entity._lastSeenTime = Date.now();
        this._hiddenEnemies.delete(entity);
      } else if (state === 1 && entity._lastSeenPosition && entity.isUnit) {
        // Explored but not visible - hide 3D mesh (ghost shown on minimap only)
        if (entity.mesh) entity.mesh.visible = false;
        this._hiddenEnemies.add(entity);
      } else {
        // Unexplored or no last-seen data - fully hidden
        if (entity.mesh) entity.mesh.visible = false;
        this._hiddenEnemies.add(entity);
      }
    }
  }

  /**
   * Set opacity on all mesh materials of an entity.
   */
  _setEntityOpacity(entity, opacity) {
    if (!entity.mesh) return;
    entity.mesh.traverse(child => {
      if (child.isMesh && child.material) {
        // Store original opacity if not yet stored
        if (child.material._fogOriginalOpacity === undefined) {
          child.material._fogOriginalOpacity = child.material.opacity;
          child.material._fogOriginalTransparent = child.material.transparent;
        }
        child.material.opacity = opacity;
        child.material.transparent = true;
      }
    });
  }

  /**
   * Restore original opacity on all mesh materials of an entity.
   */
  _restoreEntityOpacity(entity) {
    if (!entity.mesh) return;
    entity.mesh.traverse(child => {
      if (child.isMesh && child.material) {
        if (child.material._fogOriginalOpacity !== undefined) {
          child.material.opacity = child.material._fogOriginalOpacity;
          child.material.transparent = child.material._fogOriginalTransparent;
          delete child.material._fogOriginalOpacity;
          delete child.material._fogOriginalTransparent;
        }
      }
    });
  }

  /**
   * Check if a grid cell is currently visible to this team.
   */
  isVisible(worldX, worldZ) {
    // GD-058: Resistance Network reveals all
    if (this._resistanceReveal) return true;
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
    // Restore visibility and opacity of all hidden enemies
    for (const entity of this._hiddenEnemies) {
      if (entity.mesh) entity.mesh.visible = true;
      this._restoreEntityOpacity(entity);
    }
    this._hiddenEnemies.clear();
    // Also restore opacity for any entity that may have ghost rendering
    if (this.game.entities) {
      for (const entity of this.game.entities) {
        this._restoreEntityOpacity(entity);
        if (entity.mesh) entity.mesh.visible = true;
      }
    }
  }
}
