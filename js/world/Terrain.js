import * as THREE from 'three';
import { GAME_CONFIG } from '../core/Constants.js';

export class Terrain {
  constructor(game) {
    this.game = game;
    this.mapSize = GAME_CONFIG.mapSize;
    this.worldScale = GAME_CONFIG.worldScale;
    this.worldSize = this.mapSize * this.worldScale; // 256
    this.heightData = [];
    this.walkableGrid = []; // For pathfinding: 1=walkable, 0=water

    this.generateHeightmap();
    this.mesh = this.createMesh();
  }

  generateHeightmap() {
    // Create height data. Map layout:
    // Left 70% is land with gentle hills
    // Right 30% has a water channel/sea
    // Both sides have coastal access areas
    this.heightData = new Array(this.mapSize + 1);
    this.walkableGrid = new Array(this.mapSize);

    for (let z = 0; z <= this.mapSize; z++) {
      this.heightData[z] = new Float32Array(this.mapSize + 1);
      if (z < this.mapSize) this.walkableGrid[z] = new Uint8Array(this.mapSize);

      for (let x = 0; x <= this.mapSize; x++) {
        let height = 0;

        // Base land height with gentle noise
        height = 2 + Math.sin(x * 0.05) * 1.5 + Math.cos(z * 0.07) * 1.0
                 + Math.sin(x * 0.12 + z * 0.08) * 0.8;

        // Water channel on right side (x > 75% of map)
        const waterStart = this.mapSize * 0.72;
        if (x > waterStart) {
          const waterDepth = (x - waterStart) / (this.mapSize - waterStart);
          height = Math.max(-3, height - waterDepth * 8);
        }

        // Coastal area - gradual transition
        const coastZone = this.mapSize * 0.65;
        if (x > coastZone && x <= waterStart) {
          const t = (x - coastZone) / (waterStart - coastZone);
          height = height * (1 - t * 0.5);
        }

        // Shore access points at z=30% and z=70% of map
        // (so both bases can reach water for naval units)
        const shoreAccess1 = this.mapSize * 0.3;
        const shoreAccess2 = this.mapSize * 0.7;
        const shoreWidth = 8;
        if ((Math.abs(z - shoreAccess1) < shoreWidth || Math.abs(z - shoreAccess2) < shoreWidth) && x > coastZone) {
          height = Math.max(-0.5, height * 0.3);
        }

        this.heightData[z][x] = height;

        // Walkable check (for pathfinding grid)
        if (z < this.mapSize && x < this.mapSize) {
          this.walkableGrid[z][x] = height > -0.5 ? 1 : 0;
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

      // Set Y position
      positions[i * 3 + 1] = height;

      // Vertex colors based on height
      if (height < -0.5) {
        // Deep water
        colors[i * 3] = 0.1;
        colors[i * 3 + 1] = 0.3;
        colors[i * 3 + 2] = 0.7;
      } else if (height < 0.5) {
        // Beach/shore
        colors[i * 3] = 0.76;
        colors[i * 3 + 1] = 0.7;
        colors[i * 3 + 2] = 0.5;
      } else if (height < 3) {
        // Grass
        colors[i * 3] = 0.2 + Math.random() * 0.05;
        colors[i * 3 + 1] = 0.45 + Math.random() * 0.1;
        colors[i * 3 + 2] = 0.15;
      } else {
        // Higher ground
        colors[i * 3] = 0.3;
        colors[i * 3 + 1] = 0.5;
        colors[i * 3 + 2] = 0.2;
      }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    // Shift geometry so (0,0) is at corner, not center
    geometry.translate(this.worldSize / 2, 0, this.worldSize / 2);

    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;

    // Add water plane
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

    return group;
  }

  getHeightAt(worldX, worldZ) {
    // Convert world coords to grid coords
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
