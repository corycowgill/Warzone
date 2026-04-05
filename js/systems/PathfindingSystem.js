import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';

export class PathfindingSystem {
  constructor(game) {
    this.game = game;
    this.gridSize = GAME_CONFIG.mapSize;
    this.worldScale = GAME_CONFIG.worldScale;
    this._wallBlockedCells = new Set();
    this._wallCacheDirty = true;

    // Async worker state
    this._worker = null;
    this._workerReady = false;
    this._nextRequestId = 1;
    this._pendingRequests = new Map(); // id -> { resolve, reject }
    this._gridSentToWorker = false;

    this._initWorker();
  }

  // =============================================
  // WEB WORKER SETUP
  // =============================================

  _initWorker() {
    try {
      this._worker = new Worker('js/workers/PathfindingWorker.js');
      this._worker.onmessage = (e) => this._onWorkerMessage(e);
      this._worker.onerror = (err) => {
        console.warn('PathfindingWorker error, falling back to sync:', err.message);
        this._worker = null;
        this._workerReady = false;
      };
      this._workerReady = true;
    } catch (err) {
      console.warn('Failed to create PathfindingWorker, using sync fallback:', err.message);
      this._worker = null;
      this._workerReady = false;
    }
  }

  _onWorkerMessage(e) {
    const msg = e.data;

    if (msg.type === 'pathResult') {
      this._resolveRequest(msg.id, msg.path);
    } else if (msg.type === 'pathResultBatch') {
      for (const result of msg.results) {
        this._resolveRequest(result.id, result.path);
      }
    }
  }

  _resolveRequest(id, gridPath) {
    const pending = this._pendingRequests.get(id);
    if (!pending) return;
    this._pendingRequests.delete(id);
    if (pending.timeout) clearTimeout(pending.timeout);

    if (!gridPath || gridPath.length === 0) {
      pending.resolve(null);
      return;
    }

    // Convert grid path to world coordinates
    const terrain = this.game.terrain;
    const worldPath = [];
    for (const node of gridPath) {
      const worldPos = terrain.gridToWorld(node.x, node.y);
      const height = terrain.getHeightAt(worldPos.x, worldPos.z);
      worldPath.push(new THREE.Vector3(worldPos.x, height, worldPos.z));
    }

    pending.resolve(this.simplifyPath(worldPath));
  }

  /**
   * Send the current terrain grid and wall data to the worker.
   * Called when terrain loads or walls change.
   */
  sendGridToWorker() {
    if (!this._worker || !this._workerReady) return;

    const terrain = this.game.terrain;
    if (!terrain || !terrain.walkableGrid) return;

    // Flatten walkableGrid (array of Uint8Array rows) into a single Uint8Array
    const flat = new Uint8Array(this.gridSize * this.gridSize);
    for (let z = 0; z < this.gridSize; z++) {
      const row = terrain.walkableGrid[z];
      if (row) {
        flat.set(row, z * this.gridSize);
      }
    }

    // Build wall blocked cells
    if (this._wallCacheDirty) this._rebuildWallGrid();
    const wallCells = Array.from(this._wallBlockedCells);

    this._worker.postMessage({
      type: 'updateGrid',
      gridSize: this.gridSize,
      worldScale: this.worldScale,
      walkableGrid: flat,
      wallBlockedCells: wallCells
    }, [flat.buffer]); // Transfer the buffer for zero-copy

    this._gridSentToWorker = true;
  }

  /**
   * Send updated wall data to the worker (lighter than full grid update).
   */
  _sendWallsToWorker() {
    if (!this._worker || !this._workerReady) return;
    if (this._wallCacheDirty) this._rebuildWallGrid();
    const wallCells = Array.from(this._wallBlockedCells);
    this._worker.postMessage({
      type: 'updateWalls',
      wallBlockedCells: wallCells
    });
  }

  // =============================================
  // PUBLIC API
  // =============================================

  invalidateWallCache() {
    this._wallCacheDirty = true;
    // Also update the worker next time we send a request
    this._sendWallsToWorker();
  }

  /**
   * Synchronous pathfinding (original API, preserved for backwards compatibility).
   * Used as fallback for short paths and when worker is unavailable.
   */
  findPath(startWorld, endWorld) {
    return this.findPathForDomain(startWorld, endWorld, 'land');
  }

  /**
   * Synchronous pathfinding for a specific domain.
   * This is the original synchronous method - still works, still used for short paths.
   */
  findPathForDomain(startWorld, endWorld, domain) {
    // Air units: straight line path (ignore terrain)
    if (domain === 'air') {
      return [endWorld.clone()];
    }

    const terrain = this.game.terrain;
    if (!terrain || !terrain.walkableGrid) {
      return [endWorld.clone()];
    }

    const startGrid = terrain.worldToGrid(startWorld.x, startWorld.z);
    const endGrid = terrain.worldToGrid(endWorld.x, endWorld.z);
    const start = { x: startGrid.x, y: startGrid.z };
    const end = { x: endGrid.x, y: endGrid.z };

    start.x = Math.max(0, Math.min(this.gridSize - 1, Math.round(start.x)));
    start.y = Math.max(0, Math.min(this.gridSize - 1, Math.round(start.y)));
    end.x = Math.max(0, Math.min(this.gridSize - 1, Math.round(end.x)));
    end.y = Math.max(0, Math.min(this.gridSize - 1, Math.round(end.y)));

    const destPassable = this.isPassable(end.x, end.y, domain);
    if (!destPassable) {
      const nearest = this.findNearestPassable(end.x, end.y, domain);
      if (nearest) {
        end.x = nearest.x;
        end.y = nearest.y;
      } else {
        return [endWorld.clone()];
      }
    }

    const path = this.astar(start, end, domain);

    if (!path || path.length === 0) {
      return [endWorld.clone()];
    }

    const worldPath = [];
    for (const node of path) {
      const worldPos = terrain.gridToWorld(node.x, node.y);
      const height = terrain.getHeightAt(worldPos.x, worldPos.z);
      worldPath.push(new THREE.Vector3(worldPos.x, height, worldPos.z));
    }

    return this.simplifyPath(worldPath);
  }

  /**
   * Async pathfinding via Web Worker. Returns a Promise that resolves to a world path.
   * Falls back to sync for short distances (Manhattan distance < 20 grid cells)
   * or when the worker is unavailable.
   *
   * @param {THREE.Vector3} startWorld
   * @param {THREE.Vector3} endWorld
   * @param {string} domain - 'land', 'naval', or 'air'
   * @returns {Promise<THREE.Vector3[]>} - Array of world-space waypoints
   */
  findPathAsync(startWorld, endWorld, domain = 'land') {
    // Air units: immediate
    if (domain === 'air') {
      return Promise.resolve([endWorld.clone()]);
    }

    const terrain = this.game.terrain;
    if (!terrain || !terrain.walkableGrid) {
      return Promise.resolve([endWorld.clone()]);
    }

    const startGrid = terrain.worldToGrid(startWorld.x, startWorld.z);
    const endGrid = terrain.worldToGrid(endWorld.x, endWorld.z);

    // Manhattan distance in grid cells
    const manhattan = Math.abs(startGrid.x - endGrid.x) + Math.abs(startGrid.z - endGrid.z);

    // Short paths: use sync fallback (fast enough for main thread)
    if (manhattan < 20 || !this._worker || !this._workerReady) {
      const path = this.findPathForDomain(startWorld, endWorld, domain);
      return Promise.resolve(path);
    }

    // Ensure grid has been sent to worker
    if (!this._gridSentToWorker) {
      this.sendGridToWorker();
    }

    const id = this._nextRequestId++;

    return new Promise((resolve) => {
      this._pendingRequests.set(id, {
        resolve,
        // Auto-resolve after 2 seconds to prevent hanging
        timeout: setTimeout(() => {
          if (this._pendingRequests.has(id)) {
            this._pendingRequests.delete(id);
            // Fallback to sync
            const path = this.findPathForDomain(startWorld, endWorld, domain);
            resolve(path);
          }
        }, 2000)
      });

      this._worker.postMessage({
        type: 'findPath',
        id,
        startX: startGrid.x,
        startZ: startGrid.z,
        endX: endGrid.x,
        endZ: endGrid.z,
        domain
      });
    });
  }

  /**
   * Batch async pathfinding - send multiple requests at once for efficiency.
   * @param {Array<{start: THREE.Vector3, end: THREE.Vector3, domain: string}>} requests
   * @returns {Promise<Array<THREE.Vector3[]>>} - Array of paths, one per request
   */
  findPathBatchAsync(requests) {
    if (!this._worker || !this._workerReady) {
      // Sync fallback for all
      return Promise.resolve(
        requests.map(r => this.findPathForDomain(r.start, r.end, r.domain || 'land'))
      );
    }

    if (!this._gridSentToWorker) {
      this.sendGridToWorker();
    }

    const terrain = this.game.terrain;
    const workerRequests = [];
    const ids = [];

    for (const req of requests) {
      if (req.domain === 'air' || !terrain || !terrain.walkableGrid) {
        // We'll handle these inline
        ids.push(null);
        continue;
      }

      const startGrid = terrain.worldToGrid(req.start.x, req.start.z);
      const endGrid = terrain.worldToGrid(req.end.x, req.end.z);
      const id = this._nextRequestId++;
      ids.push(id);

      workerRequests.push({
        id,
        startX: startGrid.x,
        startZ: startGrid.z,
        endX: endGrid.x,
        endZ: endGrid.z,
        domain: req.domain || 'land'
      });
    }

    // Create promises for worker requests
    const promises = requests.map((req, i) => {
      if (ids[i] === null) {
        // Air or no terrain: immediate
        return Promise.resolve(req.domain === 'air' ? [req.end.clone()] : [req.end.clone()]);
      }

      return new Promise((resolve) => {
        this._pendingRequests.set(ids[i], {
          resolve,
          timeout: setTimeout(() => {
            if (this._pendingRequests.has(ids[i])) {
              this._pendingRequests.delete(ids[i]);
              resolve(this.findPathForDomain(req.start, req.end, req.domain || 'land'));
            }
          }, 2000)
        });
      });
    });

    // Send batch to worker
    if (workerRequests.length > 0) {
      this._worker.postMessage({
        type: 'findPathBatch',
        requests: workerRequests
      });
    }

    return Promise.all(promises);
  }

  /**
   * Clean up the worker when game is disposed.
   */
  dispose() {
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
    // Resolve any pending requests with null
    for (const [id, pending] of this._pendingRequests) {
      clearTimeout(pending.timeout);
      pending.resolve(null);
    }
    this._pendingRequests.clear();
  }

  // =============================================
  // WALL CACHE (shared between sync and worker)
  // =============================================

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

  // =============================================
  // SYNC A* IMPLEMENTATION (fallback)
  // =============================================

  isPassable(gx, gy, domain) {
    const terrain = this.game.terrain;
    if (!terrain || !terrain.walkableGrid) return true;

    if (gx < 0 || gx >= this.gridSize || gy < 0 || gy >= this.gridSize) {
      return false;
    }

    if (domain === 'naval') {
      return terrain.isWater
        ? terrain.isWater(gx * this.worldScale, gy * this.worldScale)
        : !terrain.walkableGrid[gy]?.[gx];
    }

    const walkable = terrain.walkableGrid[gy]?.[gx] === true ||
                     terrain.walkableGrid[gy]?.[gx] === 1;
    if (!walkable) return false;

    if (this._wallCacheDirty) this._rebuildWallGrid();
    if (this._wallBlockedCells.has(gx + ',' + gy)) return false;
    return true;
  }

  findNearestPassable(gx, gy, domain) {
    const maxRadius = 20;
    for (let r = 1; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
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
    const openSet = new MinHeap();
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const startKey = this.nodeKey(start.x, start.y);

    gScore.set(startKey, 0);
    fScore.set(startKey, this.heuristic(start, end));
    openSet.insert({ x: start.x, y: start.y, f: fScore.get(startKey) });

    const maxIterations = 5000;
    let iterations = 0;

    while (openSet.size() > 0 && iterations < maxIterations) {
      iterations++;

      const current = openSet.extractMin();
      const currentKey = this.nodeKey(current.x, current.y);

      if (current.x === end.x && current.y === end.y) {
        return this.reconstructPath(cameFrom, current);
      }

      closedSet.add(currentKey);

      const neighbors = this.getNeighbors(current.x, current.y);

      for (const neighbor of neighbors) {
        const neighborKey = this.nodeKey(neighbor.x, neighbor.y);

        if (closedSet.has(neighborKey)) continue;
        if (!this.isPassable(neighbor.x, neighbor.y, domain)) continue;

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

    return null;
  }

  heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  nodeKey(x, y) {
    return x + ',' + y;
  }

  getNeighbors(x, y) {
    const neighbors = [];
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: 1, y: 1 }
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

      const dx1 = curr.x - prev.x;
      const dz1 = curr.z - prev.z;
      const dx2 = next.x - curr.x;
      const dz2 = next.z - curr.z;

      const len1 = Math.sqrt(dx1 * dx1 + dz1 * dz1);
      const len2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);

      if (len1 > 0 && len2 > 0) {
        const dot = (dx1 / len1) * (dx2 / len2) + (dz1 / len1) * (dz2 / len2);
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
