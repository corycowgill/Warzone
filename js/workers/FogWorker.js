/**
 * FogWorker — Web Worker for fog of war grid computation.
 * Receives entity positions and vision data, computes grid state and texture data.
 * Returns the computed grid and RGBA texture buffer.
 */

self.onmessage = function(e) {
  const msg = e.data;
  if (msg.type === 'computeFog') {
    const result = computeFog(msg);
    // Transfer buffers back (zero-copy)
    self.postMessage(
      { type: 'fogResult', grid: result.grid, textureData: result.textureData },
      [result.grid.buffer, result.textureData.buffer]
    );
  }
};

function computeFog(data) {
  const {
    gridSize, cellSize,
    prevGrid,          // Uint8Array — previous frame grid state
    friendlyEntities,  // [{ x, z, vision, inForest }]
    enemyEntities,     // [{ x, z, sonarRevealed, combatRevealed }]
    forestGrid,        // Uint8Array or null
    flareZones,        // [{ x, z, radius }] or null
    smokeZones,        // [{ x, z, radius }] or null
  } = data;

  const grid = new Uint8Array(gridSize * gridSize);

  // Step 1: Demote visible (2) to explored (1), copy unexplored (0) and explored (1)
  for (let i = 0, len = prevGrid.length; i < len; i++) {
    grid[i] = prevGrid[i] === 2 ? 1 : prevGrid[i];
  }

  // Step 2: Mark cells visible from friendly entities
  for (let ei = 0, elen = friendlyEntities.length; ei < elen; ei++) {
    const ent = friendlyEntities[ei];
    const gx = Math.floor(ent.x / cellSize);
    const gz = Math.floor(ent.z / cellSize);
    const r = ent.vision;
    const rSq = r * r;
    const forestReducedRSq = Math.floor(r * 0.6) * Math.floor(r * 0.6);
    const observerInForest = ent.inForest;

    const minX = Math.max(0, gx - r);
    const maxX = Math.min(gridSize - 1, gx + r);
    const minZ = Math.max(0, gz - r);
    const maxZ = Math.min(gridSize - 1, gz + r);

    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - gx;
        const dz = z - gz;
        const d2 = dx * dx + dz * dz;
        if (d2 <= rSq) {
          const idx = z * gridSize + x;
          // Forest vision reduction
          if (!observerInForest && forestGrid && forestGrid[idx] === 1) {
            if (d2 <= forestReducedRSq) {
              grid[idx] = 2;
            }
          } else {
            grid[idx] = 2;
          }
        }
      }
    }
  }

  // Step 2a: Flare zones reveal area
  if (flareZones) {
    for (let fi = 0, flen = flareZones.length; fi < flen; fi++) {
      const flare = flareZones[fi];
      const fgx = Math.floor(flare.x / cellSize);
      const fgz = Math.floor(flare.z / cellSize);
      const fr = Math.ceil(flare.radius / cellSize);
      const frSq = fr * fr;
      const fMinX = Math.max(0, fgx - fr);
      const fMaxX = Math.min(gridSize - 1, fgx + fr);
      const fMinZ = Math.max(0, fgz - fr);
      const fMaxZ = Math.min(gridSize - 1, fgz + fr);
      for (let z = fMinZ; z <= fMaxZ; z++) {
        for (let x = fMinX; x <= fMaxX; x++) {
          if ((x - fgx) * (x - fgx) + (z - fgz) * (z - fgz) <= frSq) {
            grid[z * gridSize + x] = 2;
          }
        }
      }
    }
  }

  // Step 2b: Smoke zones block vision
  if (smokeZones) {
    for (let si = 0, slen = smokeZones.length; si < slen; si++) {
      const smoke = smokeZones[si];
      const sgx = Math.floor(smoke.x / cellSize);
      const sgz = Math.floor(smoke.z / cellSize);
      const sr = Math.ceil(smoke.radius / cellSize);
      const srSq = sr * sr;
      const sMinX = Math.max(0, sgx - sr);
      const sMaxX = Math.min(gridSize - 1, sgx + sr);
      const sMinZ = Math.max(0, sgz - sr);
      const sMaxZ = Math.min(gridSize - 1, sgz + sr);
      for (let z = sMinZ; z <= sMaxZ; z++) {
        for (let x = sMinX; x <= sMaxX; x++) {
          if ((x - sgx) * (x - sgx) + (z - sgz) * (z - sgz) <= srSq) {
            const idx = z * gridSize + x;
            if (grid[idx] === 2) grid[idx] = 1;
          }
        }
      }
    }
  }

  // Step 2c: Sonar/combat reveals
  for (let ei = 0, elen = enemyEntities.length; ei < elen; ei++) {
    const ent = enemyEntities[ei];
    if (ent.sonarRevealed > 0 || ent.combatRevealed) {
      const egx = Math.floor(ent.x / cellSize);
      const egz = Math.floor(ent.z / cellSize);
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          const rx = egx + dx;
          const rz = egz + dz;
          if (rx >= 0 && rx < gridSize && rz >= 0 && rz < gridSize) {
            grid[rz * gridSize + rx] = 2;
          }
        }
      }
    }
  }

  // Step 3: Generate RGBA texture data
  const textureData = new Uint8Array(gridSize * gridSize * 4);
  for (let z = 0; z < gridSize; z++) {
    for (let x = 0; x < gridSize; x++) {
      const gridIdx = z * gridSize + x;
      const texIdx = ((gridSize - 1 - z) * gridSize + x) * 4;
      const state = grid[gridIdx];
      textureData[texIdx] = 0;
      textureData[texIdx + 1] = 0;
      textureData[texIdx + 2] = 0;
      textureData[texIdx + 3] = state === 0 ? 230 : state === 1 ? 140 : 0;
    }
  }

  return { grid, textureData };
}
