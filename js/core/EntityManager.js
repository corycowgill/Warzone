/**
 * EntityManager with Spatial Hash Grid
 * Replaces O(n^2) entity lookups with O(1) cell lookups + local iteration.
 *
 * The spatial hash divides the world into fixed-size cells. Each entity is
 * assigned to the cell containing its position. Range queries only examine
 * cells that overlap the query circle, dramatically reducing comparisons
 * for combat targeting, vision checks, and selection.
 */
export class EntityManager {
  /**
   * @param {number} worldSize  - Total world extent (e.g. 256)
   * @param {number} cellSize   - Size of each hash cell (default 16 world-units, ~8 grid tiles)
   */
  constructor(worldSize, cellSize = 16) {
    this.worldSize = worldSize;
    this.cellSize = cellSize;
    this.gridWidth = Math.ceil(worldSize / cellSize);
    this.totalCells = this.gridWidth * this.gridWidth;

    // Each cell is a Set of entities for O(1) add/remove
    this.cells = new Array(this.totalCells);
    for (let i = 0; i < this.totalCells; i++) {
      this.cells[i] = new Set();
    }

    // Map entity -> cell index for fast removal
    this._entityCell = new Map();

    // Team-indexed lookups (avoid repeated .filter() on the full list)
    this._byTeam = { player: new Set(), enemy: new Set(), neutral: new Set() };
    this._unitsByTeam = { player: new Set(), enemy: new Set(), neutral: new Set() };
    this._buildingsByTeam = { player: new Set(), enemy: new Set(), neutral: new Set() };
  }

  // ───────── cell helpers ─────────

  _cellIndex(wx, wz) {
    const cx = Math.floor(wx / this.cellSize);
    const cz = Math.floor(wz / this.cellSize);
    const clampX = Math.max(0, Math.min(this.gridWidth - 1, cx));
    const clampZ = Math.max(0, Math.min(this.gridWidth - 1, cz));
    return clampZ * this.gridWidth + clampX;
  }

  // ───────── registration ─────────

  add(entity) {
    const pos = entity.getPosition();
    const idx = this._cellIndex(pos.x, pos.z);
    this.cells[idx].add(entity);
    this._entityCell.set(entity, idx);

    const team = entity.team || 'neutral';
    if (this._byTeam[team]) this._byTeam[team].add(entity);
    if (entity.isUnit && this._unitsByTeam[team]) this._unitsByTeam[team].add(entity);
    if (entity.isBuilding && this._buildingsByTeam[team]) this._buildingsByTeam[team].add(entity);
  }

  remove(entity) {
    const idx = this._entityCell.get(entity);
    if (idx !== undefined) {
      this.cells[idx].delete(entity);
      this._entityCell.delete(entity);
    }

    const team = entity.team || 'neutral';
    if (this._byTeam[team]) this._byTeam[team].delete(entity);
    if (this._unitsByTeam[team]) this._unitsByTeam[team].delete(entity);
    if (this._buildingsByTeam[team]) this._buildingsByTeam[team].delete(entity);
  }

  /**
   * Call once per frame to re-bucket entities that have moved.
   * Only units move; buildings stay in place.
   * If no argument given, iterates all tracked entities internally.
   */
  updatePositions(entities) {
    const source = entities || this._entityCell.keys();
    for (const entity of source) {
      if (!entity.alive) continue;
      if (!entity.isUnit) continue; // buildings don't move

      const pos = entity.getPosition();
      const newIdx = this._cellIndex(pos.x, pos.z);
      const oldIdx = this._entityCell.get(entity);

      if (oldIdx !== newIdx) {
        if (oldIdx !== undefined) this.cells[oldIdx].delete(entity);
        this.cells[newIdx].add(entity);
        this._entityCell.set(entity, newIdx);
      }
    }
  }

  // ───────── queries ─────────

  /**
   * Return all entities within `range` world-units of (wx, wz).
   * Optional filters: team, alive, isUnit, isBuilding.
   * @returns {Array} matching entities
   */
  queryRange(wx, wz, range, opts = {}) {
    const results = [];
    const rSq = range * range;
    const minCX = Math.max(0, Math.floor((wx - range) / this.cellSize));
    const maxCX = Math.min(this.gridWidth - 1, Math.floor((wx + range) / this.cellSize));
    const minCZ = Math.max(0, Math.floor((wz - range) / this.cellSize));
    const maxCZ = Math.min(this.gridWidth - 1, Math.floor((wz + range) / this.cellSize));

    for (let cz = minCZ; cz <= maxCZ; cz++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const cell = this.cells[cz * this.gridWidth + cx];
        for (const entity of cell) {
          // Filter checks
          if (opts.alive !== undefined && entity.alive !== opts.alive) continue;
          if (opts.team !== undefined && entity.team !== opts.team) continue;
          if (opts.isUnit !== undefined && entity.isUnit !== opts.isUnit) continue;
          if (opts.isBuilding !== undefined && entity.isBuilding !== opts.isBuilding) continue;

          const pos = entity.getPosition();
          const dx = pos.x - wx;
          const dz = pos.z - wz;
          if (dx * dx + dz * dz <= rSq) {
            results.push(entity);
          }
        }
      }
    }
    return results;
  }

  /**
   * Find the nearest entity matching filters within maxRange.
   */
  queryNearest(wx, wz, maxRange, opts = {}) {
    let best = null;
    let bestDist = Infinity;
    const rSq = maxRange * maxRange;
    const minCX = Math.max(0, Math.floor((wx - maxRange) / this.cellSize));
    const maxCX = Math.min(this.gridWidth - 1, Math.floor((wx + maxRange) / this.cellSize));
    const minCZ = Math.max(0, Math.floor((wz - maxRange) / this.cellSize));
    const maxCZ = Math.min(this.gridWidth - 1, Math.floor((wz + maxRange) / this.cellSize));

    for (let cz = minCZ; cz <= maxCZ; cz++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const cell = this.cells[cz * this.gridWidth + cx];
        for (const entity of cell) {
          if (opts.alive !== undefined && entity.alive !== opts.alive) continue;
          if (opts.team !== undefined && entity.team !== opts.team) continue;
          if (opts.isUnit !== undefined && entity.isUnit !== opts.isUnit) continue;
          if (opts.isBuilding !== undefined && entity.isBuilding !== opts.isBuilding) continue;

          const pos = entity.getPosition();
          const dx = pos.x - wx;
          const dz = pos.z - wz;
          const d2 = dx * dx + dz * dz;
          if (d2 <= rSq && d2 < bestDist) {
            bestDist = d2;
            best = entity;
          }
        }
      }
    }
    return best;
  }

  /**
   * Query all entities within an axis-aligned rectangle.
   * @param {number} minX
   * @param {number} minZ
   * @param {number} maxX
   * @param {number} maxZ
   * @param {object} opts - Optional filters: { team, alive, isUnit, isBuilding }
   * @returns {Array} matching entities
   */
  queryRect(minX, minZ, maxX, maxZ, opts = {}) {
    const results = [];
    const minCX = Math.max(0, Math.floor(minX / this.cellSize));
    const maxCX = Math.min(this.gridWidth - 1, Math.floor(maxX / this.cellSize));
    const minCZ = Math.max(0, Math.floor(minZ / this.cellSize));
    const maxCZ = Math.min(this.gridWidth - 1, Math.floor(maxZ / this.cellSize));

    for (let cz = minCZ; cz <= maxCZ; cz++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const cell = this.cells[cz * this.gridWidth + cx];
        for (const entity of cell) {
          if (opts.alive !== undefined && entity.alive !== opts.alive) continue;
          if (opts.team !== undefined && entity.team !== opts.team) continue;
          if (opts.isUnit !== undefined && entity.isUnit !== opts.isUnit) continue;
          if (opts.isBuilding !== undefined && entity.isBuilding !== opts.isBuilding) continue;

          const pos = entity.getPosition();
          if (pos.x >= minX && pos.x <= maxX && pos.z >= minZ && pos.z <= maxZ) {
            results.push(entity);
          }
        }
      }
    }
    return results;
  }

  /**
   * Clear all data structures (used on game restart).
   */
  clear() {
    for (let i = 0; i < this.totalCells; i++) {
      this.cells[i].clear();
    }
    this._entityCell.clear();
    for (const key of Object.keys(this._byTeam)) this._byTeam[key].clear();
    for (const key of Object.keys(this._unitsByTeam)) this._unitsByTeam[key].clear();
    for (const key of Object.keys(this._buildingsByTeam)) this._buildingsByTeam[key].clear();
  }

  // ───────── team-indexed accessors (drop-in for Game.getUnits etc.) ─────────

  getEntitiesByTeam(team) {
    const set = this._byTeam[team];
    if (!set) return [];
    const result = [];
    for (const e of set) {
      if (e.alive) result.push(e);
    }
    return result;
  }

  getUnits(team) {
    const set = this._unitsByTeam[team];
    if (!set) return [];
    const result = [];
    for (const e of set) {
      if (e.alive) result.push(e);
    }
    return result;
  }

  getBuildings(team) {
    const set = this._buildingsByTeam[team];
    if (!set) return [];
    const result = [];
    for (const e of set) {
      if (e.alive) result.push(e);
    }
    return result;
  }

  /**
   * Remove dead entities from all data structures.
   * Call periodically (e.g. after the death sweep in Game.update).
   */
  cleanup() {
    // Collect dead entities first to avoid modifying Map during iteration
    const dead = [];
    for (const [entity] of this._entityCell) {
      if (!entity.alive) dead.push(entity);
    }
    for (let i = 0, len = dead.length; i < len; i++) {
      this.remove(dead[i]);
    }
  }
}
