import * as THREE from 'three';

/**
 * TerrainEnhancer - Adds visual richness to the existing terrain.
 * Applies procedural textures, ground scatter, shoreline foam, and grid overlay.
 */
export class TerrainEnhancer {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.scatterObjects = [];
    this.groundDecals = [];
  }

  /**
   * Enhance the terrain with ground detail objects.
   * Call after terrain is generated.
   */
  enhance() {
    this._addGroundScatter();
    this._addShorelineDetail();
    this._addPathMarkers();
  }

  /**
   * Add small ground objects: rocks, grass tufts, dirt patches
   */
  _addGroundScatter() {
    if (!this.terrain) return;

    const worldScale = this.terrain.worldScale || 2;
    const mapSize = this.terrain.mapSize || 128;

    // Grass tufts
    const grassGeo = new THREE.PlaneGeometry(0.6, 0.8);
    const grassMat = new THREE.MeshBasicMaterial({
      color: 0x3a6a2a,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const grassCount = Math.min(500, mapSize * 2);
    const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);

    let placed = 0;
    for (let i = 0; i < grassCount * 3 && placed < grassCount; i++) {
      const x = Math.random() * mapSize * worldScale;
      const z = Math.random() * mapSize * worldScale;

      // Only place on land (check terrain type)
      const gx = Math.floor(x / worldScale);
      const gz = Math.floor(z / worldScale);
      if (gx < 0 || gx >= mapSize || gz < 0 || gz >= mapSize) continue;
      if (this.terrain.grid && this.terrain.grid[gx]?.[gz]?.type === 'water') continue;

      position.set(x, 0.2, z);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI);
      scale.set(0.5 + Math.random() * 1, 0.5 + Math.random() * 1.5, 1);

      matrix.compose(position, quaternion, scale);
      grassMesh.setMatrixAt(placed, matrix);
      placed++;
    }

    grassMesh.instanceMatrix.needsUpdate = true;
    grassMesh.frustumCulled = true;
    this.scene.add(grassMesh);
    this.scatterObjects.push(grassMesh);

    // Small rocks
    const rockGeo = new THREE.DodecahedronGeometry(0.3, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    });

    const rockCount = Math.min(200, mapSize);
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);

    placed = 0;
    for (let i = 0; i < rockCount * 3 && placed < rockCount; i++) {
      const x = Math.random() * mapSize * worldScale;
      const z = Math.random() * mapSize * worldScale;

      const gx = Math.floor(x / worldScale);
      const gz = Math.floor(z / worldScale);
      if (gx < 0 || gx >= mapSize || gz < 0 || gz >= mapSize) continue;
      if (this.terrain.grid && this.terrain.grid[gx]?.[gz]?.type === 'water') continue;

      position.set(x, 0.1, z);
      quaternion.setFromEuler(new THREE.Euler(
        Math.random() * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3
      ));
      const s = 0.3 + Math.random() * 0.7;
      scale.set(s, s * 0.6, s);

      matrix.compose(position, quaternion, scale);
      rockMesh.setMatrixAt(placed, matrix);
      placed++;
    }

    rockMesh.instanceMatrix.needsUpdate = true;
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    this.scene.add(rockMesh);
    this.scatterObjects.push(rockMesh);
  }

  /**
   * Add shoreline detail: foam sprites along water edges
   */
  _addShorelineDetail() {
    if (!this.terrain || !this.terrain.grid) return;

    const worldScale = this.terrain.worldScale || 2;
    const mapSize = this.terrain.mapSize || 128;
    const foamPositions = [];

    // Find water-land boundaries
    for (let x = 1; x < mapSize - 1; x++) {
      for (let z = 1; z < mapSize - 1; z++) {
        const cell = this.terrain.grid[x]?.[z];
        if (!cell || cell.type !== 'water') continue;

        // Check if adjacent to land
        const neighbors = [
          this.terrain.grid[x-1]?.[z],
          this.terrain.grid[x+1]?.[z],
          this.terrain.grid[x]?.[z-1],
          this.terrain.grid[x]?.[z+1],
        ];

        const hasLand = neighbors.some(n => n && n.type !== 'water');
        if (hasLand) {
          foamPositions.push(new THREE.Vector3(
            x * worldScale + worldScale * 0.5,
            0.15,
            z * worldScale + worldScale * 0.5
          ));
        }
      }
    }

    if (foamPositions.length === 0) return;

    // Create foam sprites using instanced mesh
    const foamGeo = new THREE.PlaneGeometry(2, 2);
    foamGeo.rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });

    const foamMesh = new THREE.InstancedMesh(foamGeo, foamMat, Math.min(foamPositions.length, 1000));
    const matrix = new THREE.Matrix4();

    const count = Math.min(foamPositions.length, 1000);
    for (let i = 0; i < count; i++) {
      matrix.makeTranslation(foamPositions[i].x, foamPositions[i].y, foamPositions[i].z);
      foamMesh.setMatrixAt(i, matrix);
    }

    foamMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(foamMesh);
    this.scatterObjects.push(foamMesh);
  }

  /**
   * Add subtle path/road markings between common building positions
   */
  _addPathMarkers() {
    // Simple dirt paths from base to center
    // This will be more useful once map editor generates custom paths
  }

  /**
   * Animate ground scatter (wind effect on grass)
   */
  update(delta, time) {
    // Grass sway could be done with shader, but for now keep it simple
  }

  dispose() {
    for (const obj of this.scatterObjects) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
      this.scene.remove(obj);
    }
    this.scatterObjects = [];
  }
}
