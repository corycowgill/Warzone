import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class SupplyDepot extends Building {
  constructor(team, position, game) {
    super('supplydepot', team, position, BUILDING_STATS.supplydepot);
    this.game = game;
    this.mesh = this.createMesh();
    this.mesh.position.copy(position);
    this.createSelectionRing(this.size * 2);
    this.createHealthBar();
  }

  createMesh() {
    const model = assetManager.getTeamTintedModel('bld_supplydepot', this.team);
    if (model) {
      const group = new THREE.Group();
      group.add(model);
      return group;
    }
    return this._createProceduralMesh();
  }

  _createProceduralMesh() {
    const group = new THREE.Group();
    const teamColor = this.team === 'player' ? 0x3366ff : 0xff3333;

    // Concrete pad
    const padGeo = new THREE.BoxGeometry(2.5, 0.1, 2.5);
    const padMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(0, 0.05, 0);
    pad.receiveShadow = true;
    group.add(pad);

    // Supply tent / quonset hut shape
    const hutGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.4, 8, 1, false, 0, Math.PI);
    const hutMat = new THREE.MeshPhongMaterial({ color: 0x5B6B3B, side: THREE.DoubleSide });
    const hut = new THREE.Mesh(hutGeo, hutMat);
    hut.rotation.z = Math.PI / 2;
    hut.rotation.y = Math.PI / 2;
    hut.position.set(0, 1.2, 0);
    hut.castShadow = true;
    group.add(hut);

    // End wall
    const wallGeo = new THREE.CircleGeometry(1.2, 8, 0, Math.PI);
    const wallMat = new THREE.MeshPhongMaterial({ color: 0x4a5a2a, side: THREE.DoubleSide });
    const wall1 = new THREE.Mesh(wallGeo, wallMat);
    wall1.rotation.y = Math.PI;
    wall1.position.set(0, 1.2, -1.2);
    group.add(wall1);

    // Door opening on front
    const doorGeo = new THREE.BoxGeometry(0.8, 1.2, 0.05);
    const doorMat = new THREE.MeshPhongMaterial({ color: 0x2a1a0a });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 0.7, 1.2);
    group.add(door);

    // Supply crates around the depot
    const crateGeo = new THREE.BoxGeometry(0.4, 0.3, 0.3);
    const crateMat = new THREE.MeshPhongMaterial({ color: 0x3B5323 });
    const positions = [
      [1.5, 0.25, 0.5], [1.3, 0.25, -0.2], [1.6, 0.25, -0.7],
      [-1.4, 0.25, 0.3], [-1.6, 0.25, -0.4]
    ];
    for (const [x, y, z] of positions) {
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(x, y, z);
      crate.rotation.y = Math.random() * 0.5;
      crate.castShadow = true;
      group.add(crate);
    }

    // Team marker
    const markerGeo = new THREE.BoxGeometry(0.6, 0.3, 0.06);
    const markerMat = new THREE.MeshPhongMaterial({ color: teamColor, emissive: teamColor, emissiveIntensity: 0.3 });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(0, 2.0, 0.3);
    group.add(marker);

    return group;
  }
}
