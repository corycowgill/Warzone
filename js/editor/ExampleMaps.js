/**
 * ExampleMaps - Three pre-built maps demonstrating the editor's output format.
 * These appear in the custom maps list for gameplay.
 */

/**
 * Terrain type indices:
 * 0 = grass, 1 = dirt, 2 = sand, 3 = rock, 4 = snow
 */

function generateHeightmap(size, generator) {
  const data = [];
  for (let z = 0; z <= size; z++) {
    data[z] = new Float32Array(size + 1);
    for (let x = 0; x <= size; x++) {
      data[z][x] = generator(x, z, size);
    }
  }
  return data;
}

function flattenToArray(heightData, size) {
  const flat = [];
  for (let z = 0; z <= size; z++) {
    for (let x = 0; x <= size; x++) {
      flat.push(Math.round((heightData[z]?.[x] || 0) * 100) / 100);
    }
  }
  return flat;
}

function rleEncode(arr) {
  if (arr.length === 0) return [];
  const result = [];
  let current = arr[0];
  let count = 1;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === current) {
      count++;
    } else {
      result.push(count, current);
      current = arr[i];
      count = 1;
    }
  }
  result.push(count, current);
  return result;
}

function seededRandom(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ========== CROSSROADS ==========
function buildCrossroads() {
  const size = 128;
  const rng = seededRandom(42);

  const heightData = generateHeightmap(size, (x, z, s) => {
    // Flat terrain with gentle rolling hills
    const cx = s / 2, cz = s / 2;
    let h = 2.0;
    // Add gentle noise
    h += Math.sin(x * 0.08) * 0.5 + Math.cos(z * 0.06) * 0.4;
    h += Math.sin((x + z) * 0.05) * 0.3;

    // Crossroads: slightly depressed paths
    const distToHoriz = Math.abs(z - cz);
    const distToVert = Math.abs(x - cx);
    const pathWidth = 6;
    if (distToHoriz < pathWidth || distToVert < pathWidth) {
      h = Math.max(1.0, h - 0.5);
    }

    // Flatten edges to land
    const edgeDist = Math.min(x, z, s - x, s - z);
    if (edgeDist < 5) h = Math.max(1.5, h);

    return h;
  });

  // Terrain types: dirt paths, grass elsewhere
  const terrainFlat = [];
  const half = size / 2;
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const dH = Math.abs(z - half);
      const dV = Math.abs(x - half);
      if (dH < 6 || dV < 6) {
        terrainFlat.push(1); // dirt (road)
      } else {
        terrainFlat.push(0); // grass
      }
    }
  }

  // Trees scattered away from center and start positions
  const trees = [];
  for (let i = 0; i < 60; i++) {
    const tx = Math.floor(rng() * (size - 20)) + 10;
    const tz = Math.floor(rng() * (size - 20)) + 10;
    const dC = Math.sqrt((tx - half) ** 2 + (tz - half) ** 2);
    if (dC > 25 && dC < 50) {
      trees.push({ x: tx, z: tz, scale: 0.6 + rng() * 0.8 });
    }
  }

  const worldScale = 2;
  return {
    version: 1,
    metadata: {
      name: 'Crossroads',
      description: '4 resource nodes at map center intersection. Control the crossroads to dominate.',
      author: 'Warzone Team',
      size,
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    heightmap: flattenToArray(heightData, size),
    terrainTypes: rleEncode(terrainFlat),
    waterZones: [],
    trees: trees,
    entities: [],
    resourceNodes: [
      { x: half * worldScale - 15, z: half * worldScale - 15 },
      { x: half * worldScale + 15, z: half * worldScale - 15 },
      { x: half * worldScale - 15, z: half * worldScale + 15 },
      { x: half * worldScale + 15, z: half * worldScale + 15 }
    ],
    playerStarts: [
      { team: 'player', x: 30, z: half * worldScale },
      { team: 'enemy', x: (size - 15) * worldScale, z: half * worldScale }
    ],
    neutralStructures: [
      { type: 'watchtower', x: half * worldScale, z: half * worldScale }
    ]
  };
}

// ========== ISLAND CHAIN ==========
function buildIslandChain() {
  const size = 128;
  const rng = seededRandom(137);

  // Define island centers
  const islands = [
    { cx: 20, cz: 64, r: 20 },   // Player island
    { cx: 108, cz: 64, r: 20 },   // Enemy island
    { cx: 45, cz: 40, r: 12 },    // Mid-left island
    { cx: 64, cz: 64, r: 14 },    // Center island
    { cx: 83, cz: 88, r: 12 },    // Mid-right island
    { cx: 45, cz: 95, r: 10 },    // Lower-left small
    { cx: 83, cz: 35, r: 10 },    // Upper-right small
  ];

  const heightData = generateHeightmap(size, (x, z, s) => {
    let h = -3; // deep water by default

    for (const isl of islands) {
      const dist = Math.sqrt((x - isl.cx) ** 2 + (z - isl.cz) ** 2);
      if (dist < isl.r) {
        const t = 1 - (dist / isl.r);
        const islandH = 2 + t * 3 + Math.sin(x * 0.1) * 0.3 + Math.cos(z * 0.12) * 0.2;
        h = Math.max(h, islandH);
      }
    }

    // Shallow water connections (land bridges just below water or at water level)
    const bridgePaths = [
      [islands[0], islands[2]],
      [islands[2], islands[3]],
      [islands[3], islands[4]],
      [islands[4], islands[1]],
      [islands[5], islands[2]],
      [islands[6], islands[4]]
    ];

    for (const [a, b] of bridgePaths) {
      const dx = b.cx - a.cx;
      const dz = b.cz - a.cz;
      const len = Math.sqrt(dx * dx + dz * dz);
      const nx = dx / len, nz = dz / len;
      // Project point onto line segment
      const t = Math.max(0, Math.min(1, ((x - a.cx) * nx + (z - a.cz) * nz) / len));
      const px = a.cx + t * dx;
      const pz = a.cz + t * dz;
      const distToLine = Math.sqrt((x - px) ** 2 + (z - pz) ** 2);
      if (distToLine < 4) {
        h = Math.max(h, -0.3 + (1 - distToLine / 4) * 0.5); // shallow crossing
      }
    }

    return h;
  });

  // Terrain types: sand near shore, grass on islands
  const terrainFlat = [];
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const h = heightData[z]?.[x] || 0;
      if (h < 0.5) {
        terrainFlat.push(2); // sand
      } else {
        terrainFlat.push(0); // grass
      }
    }
  }

  const trees = [];
  for (let i = 0; i < 40; i++) {
    const isl = islands[Math.floor(rng() * islands.length)];
    const angle = rng() * Math.PI * 2;
    const dist = rng() * (isl.r - 5);
    const tx = Math.floor(isl.cx + Math.cos(angle) * dist);
    const tz = Math.floor(isl.cz + Math.sin(angle) * dist);
    if (tx > 0 && tx < size && tz > 0 && tz < size) {
      const h = heightData[tz]?.[tx] || 0;
      if (h > 1) {
        trees.push({ x: tx, z: tz, scale: 0.5 + rng() * 0.7 });
      }
    }
  }

  const ws = 2;
  return {
    version: 1,
    metadata: {
      name: 'Island Chain',
      description: 'Multiple small islands connected by shallow water. Naval and air power are key.',
      author: 'Warzone Team',
      size,
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    heightmap: flattenToArray(heightData, size),
    terrainTypes: rleEncode(terrainFlat),
    waterZones: [],
    trees,
    entities: [],
    resourceNodes: [
      { x: islands[2].cx * ws, z: islands[2].cz * ws },
      { x: islands[3].cx * ws, z: islands[3].cz * ws },
      { x: islands[4].cx * ws, z: islands[4].cz * ws },
      { x: islands[5].cx * ws, z: islands[5].cz * ws },
      { x: islands[6].cx * ws, z: islands[6].cz * ws }
    ],
    playerStarts: [
      { team: 'player', x: islands[0].cx * ws, z: islands[0].cz * ws },
      { team: 'enemy', x: islands[1].cx * ws, z: islands[1].cz * ws }
    ],
    neutralStructures: [
      { type: 'supply_depot', x: islands[3].cx * ws, z: islands[3].cz * ws }
    ]
  };
}

// ========== MOUNTAIN PASS ==========
function buildMountainPass() {
  const size = 128;
  const rng = seededRandom(256);

  const heightData = generateHeightmap(size, (x, z, s) => {
    const half = s / 2;
    let h = 2.0;

    // Create mountain ridges on top and bottom
    const distFromHoriz = Math.abs(z - half);
    const passWidth = 12 + Math.sin(x * 0.08) * 4; // Winding pass

    if (distFromHoriz > passWidth) {
      // Mountain zone
      const mountainFactor = (distFromHoriz - passWidth) / 20;
      h = 2 + Math.min(mountainFactor, 1) * 8;
      h += Math.sin(x * 0.15) * 1.5 + Math.cos(z * 0.12) * 1.0;
    } else {
      // Pass floor - relatively flat
      h = 1.5 + Math.sin(x * 0.1) * 0.3;
    }

    // Flatten player bases at left and right
    const baseFlatR = 25;
    const playerDist = Math.sqrt((x - 15) ** 2 + (z - half) ** 2);
    const enemyDist = Math.sqrt((x - (s - 15)) ** 2 + (z - half) ** 2);
    if (playerDist < baseFlatR) {
      const t = playerDist / baseFlatR;
      h = h * t + 2.0 * (1 - t);
    }
    if (enemyDist < baseFlatR) {
      const t = enemyDist / baseFlatR;
      h = h * t + 2.0 * (1 - t);
    }

    // Ensure edges are land
    const edgeDist = Math.min(x, z, s - x, s - z);
    if (edgeDist < 3) h = Math.max(2, h);

    return h;
  });

  // Terrain types: rock in mountains, dirt in pass, grass in bases
  const terrainFlat = [];
  const half = size / 2;
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const h = heightData[z]?.[x] || 0;
      if (h > 6) {
        terrainFlat.push(3); // rock
      } else if (h > 4) {
        terrainFlat.push(1); // dirt
      } else {
        terrainFlat.push(0); // grass
      }
    }
  }

  const trees = [];
  for (let i = 0; i < 50; i++) {
    const tx = Math.floor(rng() * (size - 10)) + 5;
    const tz = Math.floor(rng() * (size - 10)) + 5;
    const h = heightData[tz]?.[tx] || 0;
    if (h > 1 && h < 5) {
      trees.push({ x: tx, z: tz, scale: 0.5 + rng() * 0.6 });
    }
  }

  const ws = 2;
  return {
    version: 1,
    metadata: {
      name: 'Mountain Pass',
      description: 'Narrow passage between two base areas flanked by impassable mountains.',
      author: 'Warzone Team',
      size,
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    heightmap: flattenToArray(heightData, size),
    terrainTypes: rleEncode(terrainFlat),
    waterZones: [],
    trees,
    entities: [],
    resourceNodes: [
      { x: half * ws - 10, z: half * ws },
      { x: half * ws + 10, z: half * ws },
      { x: 40 * ws, z: half * ws },
      { x: (size - 40) * ws, z: half * ws }
    ],
    playerStarts: [
      { team: 'player', x: 30, z: half * ws },
      { team: 'enemy', x: (size - 15) * ws, z: half * ws }
    ],
    neutralStructures: [
      { type: 'repair_bay', x: half * ws, z: half * ws },
      { type: 'watchtower', x: half * ws, z: (half - 18) * ws }
    ]
  };
}

export const EXAMPLE_MAPS = {
  crossroads: buildCrossroads(),
  island_chain: buildIslandChain(),
  mountain_pass: buildMountainPass()
};

/**
 * Get list of example maps with metadata (sync).
 */
export function getExampleMapList() {
  return Object.entries(EXAMPLE_MAPS).map(([key, map]) => ({
    id: 'example_' + key,
    name: map.metadata.name,
    description: map.metadata.description,
    size: map.metadata.size,
    isExample: true
  }));
}
