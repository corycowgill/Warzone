import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';

export class PathfindingSystem {
  constructor(game) {
    this.game = game;
    this.gridSize = GAME_CONFIG.mapSize;
    this.worldScale = GAME_CONFIG.worldScale;
    this._wallBlockedCells = new Set();
    this._wallCacheDirty = true;
  }

  invalidateWallCache() {
    this._wallCacheDirty = true;
  }

  _rebuildWallGrid() {
    this._wallBlockedCells = new Set();
    for (const entity of this.game.entities) {
      if (!entity.alive || !entity.isBuilding || entity.type !== 'wall') continue;
      const pos = entity.getPosition();
      const gx = Math.round(pos.x / this.worldScale);
      const gz = Math.round(pos.z / this.worldScale);
      const r = Math.ceil(3 / this.worldScale);
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          this._wallBlockedCells.add((gx + dx) + ',' + (gz + dz));
        }
      }
    }
    this._wallCacheDirty = false;
  }

  findPath(startWorld, endWorld) {
    return this.findPathForDomain(startWorld, endWorld, 'land');
  }

  findPathForDomain(startWorld, endWorld, domain) {
    // Air units: straight line path (ignore terrain)
    if (domain === 'air') {
      return [endWorld.clone()];
    }

    const terrain = this.game.terrain;
    if (!terrain || !terrain.walkableGrid) {
      // No terrain data, return direct path
      return [endWorld.clone()];
    }

    // Convert world coords to grid coords
    // worldToGrid returns {x, z}, but pathfinding uses {x, y} where y=z
    const startGrid = terrain.worldToGrid(startWorld.x, startWorld.z);
    const endGrid = terrain.worldToGrid(endWorld.x, endWorld.z);
    const start = { x: startGrid.x, y: startGrid.z };
    const end = { x: endGrid.x, y: endGrid.z };

    // Clamp to grid bounds
    start.x = Math.max(0, Math.min(this.gridSize - 1, Math.round(start.x)));
    start.y = Math.max(0, Math.min(this.gridSize - 1, Math.round(start.y)));
    end.x = Math.max(0, Math.min(this.gridSize - 1, Math.round(end.x)));
    end.y = Math.max(0, Math.min(this.gridSize - 1, Math.round(end.y)));

    // Check if destination is reachable
    const destPassable = this.isPassable(end.x, end.y, domain);
    if (!destPassable) {
      // Find nearest passable cell to destination
      const nearest = this.findNearestPassable(end.x, end.y, domain);
      if (nearest) {
        end.x = nearest.x;
        end.y = nearest.y;
      } else {
        return [endWorld.clone()]; // Give up
      }
    }

    // Run A* pathfinding
    const path = this.astar(start, end, domain);

    if (!path || path.length === 0) {
      // No path found, return direct line
      return [endWorld.clone()];
    }

    // Convert grid path back to world coordinates
    // gridToWorld takes (gridX, gridZ) and returns {x, z}
    const worldPath = [];
    for (const node of path) {
      const worldPos = terrain.gridToWorld(node.x, node.y); // node.y is grid Z
      const height = terrain.getHeightAt(worldPos.x, worldPos.z);
      worldPath.push(new THREE.Vector3(worldPos.x, height, worldPos.z));
    }

    // Simplify path by removing collinear waypoints
    return this.simplifyPath(worldPath);
  }

  isPassable(gx, gy, domain) {
    const terrain = this.game.terrain;
    if (!terrain || !terrain.walkableGrid) return true;

    if (gx < 0 || gx >= this.gridSize || gy < 0 || gy >= this.gridSize) {
      return false;
    }

    if (domain === 'naval') {
      // Naval units can traverse water, not land
      return terrain.isWater
        ? terrain.isWater(gx * this.worldScale, gy * this.worldScale)
        : !terrain.walkableGrid[gy]?.[gx];
    }

    // Land units use walkable grid
    const walkable = terrain.walkableGrid[gy]?.[gx] === true ||
                     terrain.walkableGrid[gy]?.[gx] === 1;
    if (!walkable) return false;

    // Check pre-computed wall grid (O(1) lookup instead of iterating all entities)
    if (this._wallCacheDirty) this._rebuildWallGrid();
    if (this._wallBlockedCells.has(gx + ',' + gy)) return false;
    return true;
  }

  findNearestPassable(gx, gy, domain) {
    const maxRadius = 20;
    for (let r = 1; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // Only check perimeter
          const nx = gx + dx;
          const ny = gy + dy;
          if (this.isPassable(nx, ny, domain)) {
            return { x: nx, y: ny };
          }
        }
      }
    }
    return null;
  }

  astar(start, end, domain) {
    // A* with Manhattan distance heuristic
    const openSet = new MinHeap();
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const startKey = this.nodeKey(start.x, start.y);
    const endKey = this.nodeKey(end.x, end.y);

    gScore.set(startKey, 0);
    fScore.set(startKey, this.heuristic(start, end));
    openSet.insert({ x: start.x, y: start.y, f: fScore.get(startKey) });

    const maxIterations = 5000; // Prevent infinite loops
    let iterations = 0;

    while (openSet.size() > 0 && iterations < maxIterations) {
      iterations++;

      const current = openSet.extractMin();
      const currentKey = this.nodeKey(current.x, current.y);

      if (current.x === end.x && current.y === end.y) {
        // Reconstruct path
        return this.reconstructPath(cameFrom, current);
      }

      closedSet.add(currentKey);

      // Explore neighbors (4-directional + diagonals)
      const neighbors = this.getNeighbors(current.x, current.y);

      for (const neighbor of neighbors) {
        const neighborKey = this.nodeKey(neighbor.x, neighbor.y);

        if (closedSet.has(neighborKey)) continue;
        if (!this.isPassable(neighbor.x, neighbor.y, domain)) continue;

        // Diagonal movement costs more
        const isDiagonal = neighbor.x !== current.x && neighbor.y !== current.y;
        const moveCost = isDiagonal ? 1.414 : 1.0;
        const tentativeG = (gScore.get(currentKey) || Infinity) + moveCost;

        if (tentativeG < (gScore.get(neighborKey) || Infinity)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeG);
          const f = tentativeG + this.heuristic(neighbor, end);
          fScore.set(neighborKey, f);
          openSet.insert({ x: neighbor.x, y: neighbor.y, f });
        }
      }
    }

    // No path found
    return null;
  }

  heuristic(a, b) {
    // Manhattan distance
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  nodeKey(x, y) {
    return x + ',' + y;
  }

  getNeighbors(x, y) {
    const neighbors = [];
    const dirs = [
      { x: 0, y: -1 },  // up
      { x: 0, y: 1 },   // down
      { x: -1, y: 0 },  // left
      { x: 1, y: 0 },   // right
      { x: -1, y: -1 }, // upper-left
      { x: 1, y: -1 },  // upper-right
      { x: -1, y: 1 },  // lower-left
      { x: 1, y: 1 }    // lower-right
    ];

    for (const dir of dirs) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    return neighbors;
  }

  reconstructPath(cameFrom, current) {
    const path = [{ x: current.x, y: current.y }];
    let key = this.nodeKey(current.x, current.y);

    while (cameFrom.has(key)) {
      const prev = cameFrom.get(key);
      path.unshift({ x: prev.x, y: prev.y });
      key = this.nodeKey(prev.x, prev.y);
    }

    return path;
  }

  simplifyPath(worldPath) {
    if (worldPath.length <= 2) return worldPath;

    const simplified = [worldPath[0]];

    for (let i = 1; i < worldPath.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const curr = worldPath[i];
      const next = worldPath[i + 1];

      // Check if direction changes
      const dx1 = curr.x - prev.x;
      const dz1 = curr.z - prev.z;
      const dx2 = next.x - curr.x;
      const dz2 = next.z - curr.z;

      // Normalize
      const len1 = Math.sqrt(dx1 * dx1 + dz1 * dz1);
      const len2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);

      if (len1 > 0 && len2 > 0) {
        const dot = (dx1 / len1) * (dx2 / len2) + (dz1 / len1) * (dz2 / len2);
        // If direction changes significantly, keep this waypoint
        if (dot < 0.98) {
          simplified.push(curr);
        }
      }
    }

    simplified.push(worldPath[worldPath.length - 1]);
    return simplified;
  }
}

/**
 * Simple min-heap for A* open set
 */
class MinHeap {
  constructor() {
    this.heap = [];
  }

  size() {
    return this.heap.length;
  }

  insert(node) {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  extractMin() {
    if (this.heap.length === 0) return null;

    const min = this.heap[0];
    const last = this.heap.pop();

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }

    return min;
  }

  bubbleUp(idx) {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.heap[idx].f < this.heap[parentIdx].f) {
        [this.heap[idx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[idx]];
        idx = parentIdx;
      } else {
        break;
      }
    }
  }

  sinkDown(idx) {
    const length = this.heap.length;

    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < length && this.heap[left].f < this.heap[smallest].f) {
        smallest = left;
      }
      if (right < length && this.heap[right].f < this.heap[smallest].f) {
        smallest = right;
      }

      if (smallest !== idx) {
        [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
        idx = smallest;
      } else {
        break;
      }
    }
  }
}
