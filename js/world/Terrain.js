import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

// Simple seeded PRNG (mulberry32)
function createRNG(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Terrain {
  constructor(game, mapTemplate = 'continental', seed = null) {
    this.game = game;
    this.mapSize = GAME_CONFIG.mapSize;
    this.worldScale = GAME_CONFIG.worldScale;
    this.worldSize = this.mapSize * this.worldScale;
    this.heightData = [];
    this.walkableGrid = [];
    this.mapTemplate = mapTemplate;
    this.seed = seed !== null ? seed : Math.floor(Math.random() * 999999);
    this.rng = createRNG(this.seed);
    this.treePositions = [];
    this.cliffPositions = [];

    this.generateHeightmap();
    this.generateProps();
    this.mesh = this.createMesh();
  }

  // Seeded simplex-like noise using RNG
  noise2D(x, z, scale, rng) {
    // Simple value noise with interpolation
    const sx = x * scale;
    const sz = z * scale;
    const ix = Math.floor(sx);
    const iz = Math.floor(sz);
    const fx = sx - ix;
    const fz = sz - iz;

    // Use hash to get pseudo-random values at grid points
    const hash = (a, b) => {
      let h = ((a * 1274937 + b * 2749837 + this.seed * 37) & 0x7fffffff);
      h = ((h >> 13) ^ h) * 1274126177;
      return ((h >> 13) ^ h) / 2147483647.0;
    };

    const v00 = hash(ix, iz);
    const v10 = hash(ix + 1, iz);
    const v01 = hash(ix, iz + 1);
    const v11 = hash(ix + 1, iz + 1);

    // Smoothstep interpolation
    const sfx = fx * fx * (3 - 2 * fx);
    const sfz = fz * fz * (3 - 2 * fz);

    const a = v00 + (v10 - v00) * sfx;
    const b = v01 + (v11 - v01) * sfx;
    return a + (b - a) * sfz;
  }

  fbm(x, z, octaves, scale) {
    let value = 0;
    let amplitude = 1;
    let frequency = scale;
    let totalAmp = 0;
    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x, z, frequency) * amplitude;
      totalAmp += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value / totalAmp;
  }

  generateHeightmap() {
    this.heightData = new Array(this.mapSize + 1);
    this.walkableGrid = new Array(this.mapSize);

    for (let z = 0; z <= this.mapSize; z++) {
      this.heightData[z] = new Float32Array(this.mapSize + 1);
      if (z < this.mapSize) this.walkableGrid[z] = new Uint8Array(this.mapSize);
    }

    switch (this.mapTemplate) {
      case 'islands': this.generateIslands(); break;
      case 'river': this.generateRiver(); break;
      case 'plains': this.generatePlains(); break;
      case 'continental':
      default: this.generateContinental(); break;
    }
  }

  generateContinental() {
    for (let z = 0; z <= this.mapSize; z++) {
      for (let x = 0; x <= this.mapSize; x++) {
        let height = 0;
        // Base terrain noise
        height = 2 + this.fbm(x, z, 4, 0.03) * 3.0;
        height += Math.sin(x * 0.05 + this.seed) * 1.0 + Math.cos(z * 0.07 + this.seed * 0.7) * 0.8;

        // Water channel on right side (variable position based on seed)
        const waterOffset = 0.68 + this.rng() * 0.08;
        const waterStart = this.mapSize * waterOffset;
        if (x > waterStart) {
          const waterDepth = (x - waterStart) / (this.mapSize - waterStart);
          height = Math.max(-3, height - waterDepth * 8);
        }

        // Coastal transition
        const coastZone = waterStart - this.mapSize * 0.07;
        if (x > coastZone && x <= waterStart) {
          const t = (x - coastZone) / (waterStart - coastZone);
          height = height * (1 - t * 0.5);
        }

        // Shore access points (randomized positions)
        const shore1 = this.mapSize * (0.25 + this.rng() * 0.1);
        const shore2 = this.mapSize * (0.65 + this.rng() * 0.1);
        const shoreWidth = 6 + this.rng() * 4;
        if ((Math.abs(z - shore1) < shoreWidth || Math.abs(z - shore2) < shoreWidth) && x > coastZone) {
          height = Math.max(-0.5, height * 0.3);
        }

        this.setHeightAndWalkable(x, z, height);
      }
    }
    this.ensureStartingAreas();
  }

  generateIslands() {
    // Generate 3-5 island masses
    const numIslands = 3 + Math.floor(this.rng() * 3);
    const islands = [];

    // Ensure player and enemy each have an island
    islands.push({ cx: this.mapSize * 0.2, cz: this.mapSize * 0.5, r: this.mapSize * 0.2 + this.rng() * 10 });
    islands.push({ cx: this.mapSize * 0.8, cz: this.mapSize * 0.5, r: this.mapSize * 0.2 + this.rng() * 10 });

    for (let i = 2; i < numIslands; i++) {
      islands.push({
        cx: this.mapSize * (0.2 + this.rng() * 0.6),
        cz: this.mapSize * (0.15 + this.rng() * 0.7),
        r: this.mapSize * (0.08 + this.rng() * 0.12)
      });
    }

    for (let z = 0; z <= this.mapSize; z++) {
      for (let x = 0; x <= this.mapSize; x++) {
        let height = -3; // Default water
        const noise = this.fbm(x, z, 3, 0.04) * 2.0;

        for (const island of islands) {
          const dist = Math.sqrt((x - island.cx) ** 2 + (z - island.cz) ** 2);
          if (dist < island.r) {
            const t = 1 - (dist / island.r);
            const islandHeight = 2 + t * 3 + noise;
            height = Math.max(height, islandHeight);
          }
        }

        // Add some shallow areas between islands (land bridges at random)
        if (height < -0.5 && this.rng() < 0.002) {
          // Small shallow patches
        }

        this.setHeightAndWalkable(x, z, height);
      }
    }
    this.ensureStartingAreas();
  }

  generateRiver() {
    // River winding from top to bottom of map
    const riverPoints = [];
    const riverWidth = 4 + this.rng() * 3;
    let riverX = this.mapSize * 0.5;

    for (let z = 0; z <= this.mapSize; z += 4) {
      riverX += (this.rng() - 0.5) * 6;
      riverX = Math.max(this.mapSize * 0.3, Math.min(this.mapSize * 0.7, riverX));
      riverPoints.push({ x: riverX, z: z });
    }

    // Create 2-3 bridge crossing points
    const bridgeCount = 2 + Math.floor(this.rng() * 2);
    const bridgeZs = [];
    for (let i = 0; i < bridgeCount; i++) {
      bridgeZs.push(this.mapSize * (0.2 + (i / bridgeCount) * 0.6 + this.rng() * 0.1));
    }

    for (let z = 0; z <= this.mapSize; z++) {
      for (let x = 0; x <= this.mapSize; x++) {
        let height = 2 + this.fbm(x, z, 4, 0.03) * 3.0;

        // Find closest river point
        let minDist = Infinity;
        for (const rp of riverPoints) {
          const dz = Math.abs(z - rp.z);
          if (dz < 8) {
            const dx = Math.abs(x - rp.x);
            // Interpolate between river points
            const dist = Math.sqrt(dx * dx + dz * dz * 0.5);
            minDist = Math.min(minDist, dist);
          }
        }

        // Carve river
        if (minDist < riverWidth) {
          const riverDepth = (1 - minDist / riverWidth);
          height = -2 * riverDepth;
        } else if (minDist < riverWidth + 3) {
          const bankT = (minDist - riverWidth) / 3;
          height = height * bankT - 0.5 * (1 - bankT);
        }

        // Bridge crossings - raise terrain back up
        for (const bz of bridgeZs) {
          if (Math.abs(z - bz) < 3 && minDist < riverWidth + 2) {
            height = Math.max(height, 1.5);
          }
        }

        this.setHeightAndWalkable(x, z, height);
      }
    }
    this.ensureStartingAreas();
  }

  generatePlains() {
    for (let z = 0; z <= this.mapSize; z++) {
      for (let x = 0; x <= this.mapSize; x++) {
        // Rolling gentle hills, no significant water
        let height = 1.5 + this.fbm(x, z, 5, 0.02) * 4.0;
        height += Math.sin(x * 0.03 + this.seed) * 0.8;
        height += Math.cos(z * 0.04 + this.seed * 1.3) * 0.6;

        // Small ponds scattered
        const pondNoise = this.fbm(x + 500, z + 500, 2, 0.08);
        if (pondNoise < 0.2) {
          const pondDepth = (0.2 - pondNoise) / 0.2;
          height = Math.max(-1.5, height - pondDepth * 4);
        }

        // Ensure edges are land
        const edgeDist = Math.min(x, z, this.mapSize - x, this.mapSize - z);
        if (edgeDist < 5) {
          height = Math.max(1, height);
        }

        this.setHeightAndWalkable(x, z, height);
      }
    }
    this.ensureStartingAreas();
  }

  setHeightAndWalkable(x, z, height) {
    if (z <= this.mapSize) {
      this.heightData[z][x] = height;
    }
    if (z < this.mapSize && x < this.mapSize) {
      this.walkableGrid[z][x] = height > -0.5 ? 1 : 0;
    }
  }

  ensureStartingAreas() {
    // Make sure player (bottom-left) and enemy (top-right) starting positions are flat and walkable
    const playerArea = { cx: 15, cz: Math.floor(this.mapSize / 2), r: 15 };
    const enemyArea = { cx: this.mapSize - 30, cz: Math.floor(this.mapSize / 2), r: 15 };

    for (const area of [playerArea, enemyArea]) {
      for (let z = Math.max(0, area.cz - area.r); z <= Math.min(this.mapSize, area.cz + area.r); z++) {
        for (let x = Math.max(0, area.cx - area.r); x <= Math.min(this.mapSize, area.cx + area.r); x++) {
          const dist = Math.sqrt((x - area.cx) ** 2 + (z - area.cz) ** 2);
          if (dist < area.r) {
            const t = dist / area.r;
            const targetHeight = 2.0;
            const currentHeight = this.heightData[z][x];
            // Blend toward flat ground
            this.heightData[z][x] = currentHeight * t + targetHeight * (1 - t);
            if (z < this.mapSize && x < this.mapSize) {
              this.walkableGrid[z][x] = 1;
            }
          }
        }
      }
    }
  }

  generateProps() {
    // Generate tree cluster positions (on walkable land, away from starting areas)
    const numClusters = 8 + Math.floor(this.rng() * 8);
    for (let i = 0; i < numClusters; i++) {
      const cx = Math.floor(this.rng() * (this.mapSize - 20)) + 10;
      const cz = Math.floor(this.rng() * (this.mapSize - 20)) + 10;

      // Skip if near starting positions
      const distPlayer = Math.sqrt((cx - 15) ** 2 + (cz - this.mapSize / 2) ** 2);
      const distEnemy = Math.sqrt((cx - (this.mapSize - 30)) ** 2 + (cz - this.mapSize / 2) ** 2);
      if (distPlayer < 20 || distEnemy < 20) continue;

      // Skip if in water
      if (this.heightData[cz] && this.heightData[cz][cx] < 0) continue;

      const clusterSize = 3 + Math.floor(this.rng() * 5);
      for (let t = 0; t < clusterSize; t++) {
        const tx = cx + Math.floor((this.rng() - 0.5) * 6);
        const tz = cz + Math.floor((this.rng() - 0.5) * 6);
        if (tx >= 0 && tx < this.mapSize && tz >= 0 && tz < this.mapSize) {
          if (this.heightData[tz] && this.heightData[tz][tx] > 0.5) {
            this.treePositions.push({ x: tx, z: tz, scale: 0.6 + this.rng() * 0.8 });
          }
        }
      }
    }

    // Generate cliff positions on steep terrain
    for (let z = 1; z < this.mapSize - 1; z++) {
      for (let x = 1; x < this.mapSize - 1; x++) {
        const h = this.heightData[z][x];
        const hRight = this.heightData[z][x + 1];
        const hDown = this.heightData[z + 1][x];
        const slope = Math.abs(h - hRight) + Math.abs(h - hDown);
        if (slope > 3 && h > 0 && this.rng() < 0.3) {
          this.cliffPositions.push({ x, z, height: h });
        }
      }
    }
  }

  createMesh() {
    const geometry = new THREE.PlaneGeometry(
      this.worldSize, this.worldSize,
      this.mapSize, this.mapSize
    );
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position.array;
    const colors = new Float32Array(positions.length);

    for (let i = 0; i < positions.length / 3; i++) {
      const x = i % (this.mapSize + 1);
      const z = Math.floor(i / (this.mapSize + 1));
      const height = this.heightData[z][x];

      positions[i * 3 + 1] = height;

      if (height < -0.5) {
        colors[i * 3] = 0.1;
        colors[i * 3 + 1] = 0.3;
        colors[i * 3 + 2] = 0.7;
      } else if (height < 0.5) {
        colors[i * 3] = 0.76;
        colors[i * 3 + 1] = 0.7;
        colors[i * 3 + 2] = 0.5;
      } else if (height < 3) {
        const variation = this.noise2D(x, z, 0.3) * 0.08;
        colors[i * 3] = 0.2 + variation;
        colors[i * 3 + 1] = 0.45 + variation;
        colors[i * 3 + 2] = 0.15;
      } else {
        colors[i * 3] = 0.3;
        colors[i * 3 + 1] = 0.5;
        colors[i * 3 + 2] = 0.2;
      }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    geometry.translate(this.worldSize / 2, 0, this.worldSize / 2);

    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;

    const waterGeometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize);
    waterGeometry.rotateX(-Math.PI / 2);
    const waterMaterial = new THREE.MeshLambertMaterial({
      color: 0x1a6bc4,
      transparent: true,
      opacity: 0.6
    });
    const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    waterMesh.position.set(this.worldSize / 2, -0.5, this.worldSize / 2);

    const group = new THREE.Group();
    group.add(mesh);
    group.add(waterMesh);

    // Add tree props
    this.addTreeMeshes(group);

    // Add cliff props
    this.addCliffMeshes(group);

    return group;
  }

  addTreeMeshes(group) {
    if (this.treePositions.length === 0) return;

    // Tree model keys to randomly pick from
    const treeKeys = ['tree_default', 'tree_oak', 'tree_cone', 'tree_detailed', 'tree_fat'];
    const hasLoadedTrees = treeKeys.some(k => assetManager.has(k));

    if (hasLoadedTrees) {
      // Use loaded 3D tree models
      const availableKeys = treeKeys.filter(k => assetManager.has(k));

      for (const tree of this.treePositions) {
        const worldPos = this.gridToWorld(tree.x, tree.z);
        const h = this.getHeightAt(worldPos.x, worldPos.z);
        const scale = tree.scale;

        // Pick a random tree type
        const key = availableKeys[Math.floor(this.rng() * availableKeys.length)];
        const model = assetManager.getScaledModel(key);
        if (!model) continue;

        model.scale.multiplyScalar(scale);
        model.position.set(worldPos.x, h, worldPos.z);
        model.rotation.y = this.rng() * Math.PI * 2;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
          }
        });
        group.add(model);
      }
    } else {
      // GD-061: Instanced procedural trees (cone+cylinder) for performance
      const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 2, 5);
      const trunkMat = new THREE.MeshPhongMaterial({ color: 0x5a3a1a });
      const foliageGeo = new THREE.ConeGeometry(1.2, 2.5, 6);
      const foliageMat = new THREE.MeshPhongMaterial({ color: 0x2a6a1a });

      const count = this.treePositions.length;
      const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
      const foliageMesh = new THREE.InstancedMesh(foliageGeo, foliageMat, count);
      trunkMesh.castShadow = true;
      foliageMesh.castShadow = true;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const tree = this.treePositions[i];
        const worldPos = this.gridToWorld(tree.x, tree.z);
        const h = this.getHeightAt(worldPos.x, worldPos.z);
        const scale = tree.scale;

        dummy.position.set(worldPos.x, h + 1 * scale, worldPos.z);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(i, dummy.matrix);

        dummy.position.set(worldPos.x, h + 2.5 * scale, worldPos.z);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        foliageMesh.setMatrixAt(i, dummy.matrix);
      }

      group.add(trunkMesh);
      group.add(foliageMesh);
    }
  }

  addCliffMeshes(group) {
    if (this.cliffPositions.length === 0) return;

    const cliffGeo = new THREE.BoxGeometry(1.5, 2, 1.5);
    const cliffMat = new THREE.MeshPhongMaterial({ color: 0x8a8a7a });

    // Limit cliff meshes for performance
    const maxCliffs = Math.min(this.cliffPositions.length, 50);
    for (let i = 0; i < maxCliffs; i++) {
      const cliff = this.cliffPositions[i];
      const worldPos = this.gridToWorld(cliff.x, cliff.z);

      const mesh = new THREE.Mesh(cliffGeo, cliffMat);
      mesh.position.set(worldPos.x, cliff.height + 0.5, worldPos.z);
      mesh.rotation.y = this.rng() * Math.PI;
      mesh.castShadow = true;
      group.add(mesh);
    }
  }

  getHeightAt(worldX, worldZ) {
    const gx = worldX / this.worldScale;
    const gz = worldZ / this.worldScale;
    const x = Math.floor(Math.max(0, Math.min(this.mapSize - 1, gx)));
    const z = Math.floor(Math.max(0, Math.min(this.mapSize - 1, gz)));
    return this.heightData[z][x];
  }

  isWalkable(worldX, worldZ) {
    const gx = Math.floor(worldX / this.worldScale);
    const gz = Math.floor(worldZ / this.worldScale);
    if (gx < 0 || gx >= this.mapSize || gz < 0 || gz >= this.mapSize) return false;
    return this.walkableGrid[gz][gx] === 1;
  }

  isWater(worldX, worldZ) {
    return !this.isWalkable(worldX, worldZ);
  }

  worldToGrid(worldX, worldZ) {
    return {
      x: Math.floor(worldX / this.worldScale),
      z: Math.floor(worldZ / this.worldScale)
    };
  }

  gridToWorld(gridX, gridZ) {
    return {
      x: gridX * this.worldScale + this.worldScale / 2,
      z: gridZ * this.worldScale + this.worldScale / 2
    };
  }
}
