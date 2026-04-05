/**
 * SpatialGrid — spatial hash grid for fast neighbor queries.
 * Used by combat, selection, and AI systems to avoid O(n²) scans.
 */

export class SpatialGrid {
    constructor(cellSize = 10) {
        this.cellSize = cellSize;
        this.invCellSize = 1 / cellSize;
        this.cells = new Map();
        // Pre-allocated results array to minimize GC pressure
        this._results = [];
    }

    clear() {
        this.cells.clear();
    }

    /**
     * Insert an entity into the grid based on its mesh position.
     * @param {Object} entity - Must have entity.mesh.position with x/z
     */
    insert(entity) {
        const pos = entity.mesh.position;
        const cx = (pos.x * this.invCellSize) | 0;
        const cz = (pos.z * this.invCellSize) | 0;
        const key = `${cx},${cz}`;
        const bucket = this.cells.get(key);
        if (bucket) {
            bucket.push(entity);
        } else {
            this.cells.set(key, [entity]);
        }
    }

    /**
     * Query all entities within radius of (x, z). Checks actual distance.
     * @param {number} x
     * @param {number} z
     * @param {number} radius
     * @returns {Array} entities within radius (reused array — copy if you need to store it)
     */
    query(x, z, radius) {
        const results = this._results;
        results.length = 0;

        const r2 = radius * radius;
        const inv = this.invCellSize;
        const minCX = ((x - radius) * inv) | 0;
        const maxCX = ((x + radius) * inv) | 0;
        const minCZ = ((z - radius) * inv) | 0;
        const maxCZ = ((z + radius) * inv) | 0;

        for (let cx = minCX; cx <= maxCX; cx++) {
            for (let cz = minCZ; cz <= maxCZ; cz++) {
                const bucket = this.cells.get(`${cx},${cz}`);
                if (!bucket) continue;
                for (let i = 0, len = bucket.length; i < len; i++) {
                    const e = bucket[i];
                    const pos = e.mesh.position;
                    const dx = pos.x - x;
                    const dz = pos.z - z;
                    if (dx * dx + dz * dz <= r2) {
                        results.push(e);
                    }
                }
            }
        }

        return results;
    }

    /**
     * Query all entities whose position falls within an axis-aligned rectangle.
     * @param {number} minX
     * @param {number} minZ
     * @param {number} maxX
     * @param {number} maxZ
     * @returns {Array} entities in rect (reused array — copy if you need to store it)
     */
    queryRect(minX, minZ, maxX, maxZ) {
        const results = this._results;
        results.length = 0;

        const inv = this.invCellSize;
        const minCX = (minX * inv) | 0;
        const maxCX = (maxX * inv) | 0;
        const minCZ = (minZ * inv) | 0;
        const maxCZ = (maxZ * inv) | 0;

        for (let cx = minCX; cx <= maxCX; cx++) {
            for (let cz = minCZ; cz <= maxCZ; cz++) {
                const bucket = this.cells.get(`${cx},${cz}`);
                if (!bucket) continue;
                for (let i = 0, len = bucket.length; i < len; i++) {
                    const e = bucket[i];
                    const pos = e.mesh.position;
                    if (pos.x >= minX && pos.x <= maxX && pos.z >= minZ && pos.z <= maxZ) {
                        results.push(e);
                    }
                }
            }
        }

        return results;
    }
}
