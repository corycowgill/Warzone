/**
 * PathfindingWorker.js - Web Worker for async A* pathfinding
 *
 * Receives pathfinding requests via postMessage and returns computed paths.
 * Supports batch requests and a request ID system for matching results.
 *
 * Message protocol:
 *   Request:  { type: 'findPath', id, startX, startZ, endX, endZ, domain }
 *             { type: 'findPathBatch', requests: [{ id, startX, startZ, endX, endZ, domain }] }
 *             { type: 'updateGrid', gridSize, worldScale, walkableGrid, wallBlockedCells }
 *   Response: { type: 'pathResult', id, path }  (path is array of {x, y} grid coords or null)
 *             { type: 'pathResultBatch', results: [{ id, path }] }
 */

// Worker-local grid state
let gridSize = 128;
let worldScale = 2;
let walkableGrid = null;   // Flat Uint8Array, row-major [z * gridSize + x]
let wallBlockedSet = null;  // Set of 'x,y' strings

// =============================================
// MESSAGE HANDLER
// =============================================
self.onmessage = function(e) {
  const msg = e.data;

  switch (msg.type) {
    case 'updateGrid': {
      gridSize = msg.gridSize;
      worldScale = msg.worldScale;
      // walkableGrid arrives as a flat Uint8Array (transferred)
      walkableGrid = msg.walkableGrid;
      // wallBlockedCells arrives as an array of strings
      wallBlockedSet = new Set(msg.wallBlockedCells || []);
      break;
    }

    case 'updateWalls': {
      wallBlockedSet = new Set(msg.wallBlockedCells || []);
      break;
    }

    case 'findPath': {
      const path = computePath(msg);
      self.postMessage({ type: 'pathResult', id: msg.id, path });
      break;
    }

    case 'findPathBatch': {
      const results = [];
      for (const req of msg.requests) {
        const path = computePath(req);
        results.push({ id: req.id, path });
      }
      self.postMessage({ type: 'pathResultBatch', results });
      break;
    }
  }
};

// =============================================
// PATHFINDING CORE
// =============================================

function computePath(req) {
  const { startX, startZ, endX, endZ, domain } = req;

  // Air units: straight line
  if (domain === 'air') {
    return [{ x: endX, y: endZ }];
  }

  if (!walkableGrid) {
    return [{ x: endX, y: endZ }];
  }

  const start = {
    x: clamp(Math.round(startX), 0, gridSize - 1),
    y: clamp(Math.round(startZ), 0, gridSize - 1)
  };
  const end = {
    x: clamp(Math.round(endX), 0, gridSize - 1),
    y: clamp(Math.round(endZ), 0, gridSize - 1)
  };

  // Check if destination is passable
  if (!isPassable(end.x, end.y, domain)) {
    const nearest = findNearestPassable(end.x, end.y, domain);
    if (nearest) {
      end.x = nearest.x;
      end.y = nearest.y;
    } else {
      return [{ x: end.x, y: end.y }];
    }
  }

  const path = astar(start, end, domain);
  return path;
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function isPassable(gx, gy, domain) {
  if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) {
    return false;
  }

  if (domain === 'naval') {
    // Naval: passable where land is NOT walkable (i.e., water)
    // walkableGrid is flat: index = gy * gridSize + gx
    const idx = gy * gridSize + gx;
    return walkableGrid[idx] === 0;
  }

  // Land units
  const idx = gy * gridSize + gx;
  if (walkableGrid[idx] !== 1) return false;

  // Check wall blocked cells
  if (wallBlockedSet && wallBlockedSet.has(gx + ',' + gy)) return false;

  return true;
}

function findNearestPassable(gx, gy, domain) {
  const maxRadius = 20;
  for (let r = 1; r <= maxRadius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const nx = gx + dx;
        const ny = gy + dy;
        if (isPassable(nx, ny, domain)) {
          return { x: nx, y: ny };
        }
      }
    }
  }
  return null;
}

// =============================================
// A* IMPLEMENTATION
// =============================================

function astar(start, end, domain) {
  const openHeap = [];
  const closedSet = new Set();
  const cameFrom = new Map();
  const gScore = new Map();

  const startKey = start.x + ',' + start.y;
  const endKey = end.x + ',' + end.y;

  gScore.set(startKey, 0);
  const startF = heuristic(start, end);
  heapPush(openHeap, { x: start.x, y: start.y, f: startF });

  const maxIterations = 5000;
  let iterations = 0;

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

  while (openHeap.length > 0 && iterations < maxIterations) {
    iterations++;

    const current = heapPop(openHeap);
    const currentKey = current.x + ',' + current.y;

    if (current.x === end.x && current.y === end.y) {
      return reconstructPath(cameFrom, current);
    }

    closedSet.add(currentKey);

    for (const dir of dirs) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue;

      const neighborKey = nx + ',' + ny;
      if (closedSet.has(neighborKey)) continue;
      if (!isPassable(nx, ny, domain)) continue;

      const isDiagonal = dir.x !== 0 && dir.y !== 0;
      const moveCost = isDiagonal ? 1.414 : 1.0;
      const tentativeG = (gScore.get(currentKey) || Infinity) + moveCost;

      if (tentativeG < (gScore.get(neighborKey) || Infinity)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeG);
        const f = tentativeG + heuristic({ x: nx, y: ny }, end);
        heapPush(openHeap, { x: nx, y: ny, f });
      }
    }
  }

  return null;
}

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function reconstructPath(cameFrom, current) {
  const path = [{ x: current.x, y: current.y }];
  let key = current.x + ',' + current.y;

  while (cameFrom.has(key)) {
    const prev = cameFrom.get(key);
    path.unshift({ x: prev.x, y: prev.y });
    key = prev.x + ',' + prev.y;
  }

  return path;
}

// =============================================
// MIN-HEAP (binary heap sorted by .f)
// =============================================

function heapPush(heap, node) {
  heap.push(node);
  let idx = heap.length - 1;
  while (idx > 0) {
    const parentIdx = (idx - 1) >> 1;
    if (heap[idx].f < heap[parentIdx].f) {
      const tmp = heap[idx];
      heap[idx] = heap[parentIdx];
      heap[parentIdx] = tmp;
      idx = parentIdx;
    } else {
      break;
    }
  }
}

function heapPop(heap) {
  const min = heap[0];
  const last = heap.pop();
  if (heap.length > 0) {
    heap[0] = last;
    let idx = 0;
    const length = heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      if (left < length && heap[left].f < heap[smallest].f) smallest = left;
      if (right < length && heap[right].f < heap[smallest].f) smallest = right;
      if (smallest !== idx) {
        const tmp = heap[idx];
        heap[idx] = heap[smallest];
        heap[smallest] = tmp;
        idx = smallest;
      } else {
        break;
      }
    }
  }
  return min;
}
