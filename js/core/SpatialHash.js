/**
 * SpatialHash - Uniform grid spatial hash for efficient spatial queries.
 *
 * This is a standalone utility used by EntityManager internally.
 * For game-level queries, prefer EntityManager.queryRange() / queryNearest()
 * which combine spatial hashing with team/alive/type filters.
 */
export class SpatialHash {
  /**
   * @param {number} worldSize - Total world extent
   * @param {number} cellSize  - Size of each hash cell (default 16 world-units)
   */
  constructor(worldSize, cellSize = 16) {
    this.worldSize = worldSize;
    this.cellSize = cellSize;
    this.gridWidth = Math.ceil(worldSize / cellSize);
    this.totalCells = this.gridWidth * this.gridWidth;

    // Each cell is a Set for O(1) add/remove
    this.cells = new Array(this.totalCells);
    for (let i = 0; i < this.totalCells; i++) {
      this.cells[i] = new Set();
    }

    // Map entity -> cell index for fast removal/update
    this._entityCell = new Map();
  }

  _cellIndex(wx, wz) {
    const cx = Math.max(0, Math.min(this.gridWidth - 1, Math.floor(wx / this.cellSize)));
    const cz = Math.max(0, Math.min(this.gridWidth - 1, Math.floor(wz / this.cellSize)));
    return cz * this.gridWidth + cx;
  }

  /**
   * Insert an entity into the grid based on its position.
   * @param {object} entity - Must have getPosition() returning {x, z}
   */
  insert(entity) {
    const pos = entity.getPosition();
    const idx = this._cellIndex(pos.x, pos.z);
    this.cells[idx].add(entity);
    this._entityCell.set(entity, idx);
  }

  /**
   * Remove an entity from the grid.
   */
  remove(entity) {
    const idx = this._entityCell.get(entity);
    if (idx !== undefined) {
      this.cells[idx].delete(entity);
      this._entityCell.delete(entity);
    }
  }

  /**
   * Update an entity's cell if it has moved.
   */
  update(entity) {
    const pos = entity.getPosition();
    const newIdx = this._cellIndex(pos.x, pos.z);
    const oldIdx = this._entityCell.get(entity);

    if (oldIdx !== newIdx) {
      if (oldIdx !== undefined) this.cells[oldIdx].delete(entity);
      this.cells[newIdx].add(entity);
      this._entityCell.set(entity, newIdx);
    }
  }

  /**
   * Query all entities within a circular radius of (x, z).
   * @param {number} x - World X coordinate of query center
   * @param {number} z - World Z coordinate of query center
   * @param {number} radius - Search radius in world units
   * @returns {Array} Entities within radius
   */
  queryRadius(x, z, radius) {
    const results = [];
    const rSq = radius * radius;
    const minCX = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const maxCX = Math.min(this.gridWidth - 1, Math.floor((x + radius) / this.cellSize));
    const minCZ = Math.max(0, Math.floor((z - radius) / this.cellSize));
    const maxCZ = Math.min(this.gridWidth - 1, Math.floor((z + radius) / this.cellSize));

    for (let cz = minCZ; cz <= maxCZ; cz++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const cell = this.cells[cz * this.gridWidth + cx];
        for (const entity of cell) {
          const pos = entity.getPosition();
          const dx = pos.x - x;
          const dz = pos.z - z;
          if (dx * dx + dz * dz <= rSq) {
            results.push(entity);
          }
        }
      }
    }
    return results;
  }

  /**
   * Query all entities within an axis-aligned rectangle.
   * @param {number} minX
   * @param {number} minZ
   * @param {number} maxX
   * @param {number} maxZ
   * @returns {Array} Entities within the rectangle
   */
  queryRect(minX, minZ, maxX, maxZ) {
    const results = [];
    const minCX = Math.max(0, Math.floor(minX / this.cellSize));
    const maxCX = Math.min(this.gridWidth - 1, Math.floor(maxX / this.cellSize));
    const minCZ = Math.max(0, Math.floor(minZ / this.cellSize));
    const maxCZ = Math.min(this.gridWidth - 1, Math.floor(maxZ / this.cellSize));

    for (let cz = minCZ; cz <= maxCZ; cz++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const cell = this.cells[cz * this.gridWidth + cx];
        for (const entity of cell) {
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
   * Remove all entities and reset the grid.
   */
  clear() {
    for (let i = 0; i < this.totalCells; i++) {
      this.cells[i].clear();
    }
    this._entityCell.clear();
  }
}
