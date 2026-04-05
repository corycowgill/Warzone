import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS } from '../core/Constants.js';
import { assetManager } from '../rendering/AssetManager.js';

export class MunitionsCache extends Building {
  constructor(team, position, game) {
    super('munitionscache', team, position, BUILDING_STATS.munitionscache);
    this.game = game;
    this.mesh = this.createMesh();
    this.mesh.position.copy(position);
    this.createSelectionRing(this.size * 2);
    this.createHealthBar();
  }

  createMesh() {
    const model = assetManager.getTeamTintedModel('bld_munitionscache', this.team);
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

    // Concrete bunker base
    const baseGeo = new THREE.BoxGeometry(3, 0.2, 3);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, 0.1, 0);
    base.receiveShadow = true;
    group.add(base);

    // Main ammo storage building (low bunker shape)
    const bunkerGeo = new THREE.BoxGeometry(2.5, 1.5, 2.5);
    const bunkerMat = new THREE.MeshPhongMaterial({ color: 0x4a4a3a });
    const bunker = new THREE.Mesh(bunkerGeo, bunkerMat);
    bunker.position.set(0, 0.95, 0);
    bunker.castShadow = true;
    group.add(bunker);

    // Roof (slightly slanted)
    const roofGeo = new THREE.BoxGeometry(2.8, 0.15, 2.8);
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x3a3a2a });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 1.8, 0);
    roof.castShadow = true;
    group.add(roof);

    // Ammo crates stacked outside
    const crateGeo = new THREE.BoxGeometry(0.5, 0.4, 0.3);
    const crateMat = new THREE.MeshPhongMaterial({ color: 0x8B7355 });
    const cratePositions = [
      [1.7, 0.3, 0.6], [1.7, 0.3, -0.3], [1.7, 0.7, 0.15],
      [-1.7, 0.3, 0.4], [-1.7, 0.3, -0.5]
    ];
    for (const [x, y, z] of cratePositions) {
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(x, y, z);
      crate.castShadow = true;
      group.add(crate);
    }

    // Bullet / shell markers on crates (small yellow cylinders)
    const shellGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.25, 6);
    const shellMat = new THREE.MeshPhongMaterial({ color: 0xddaa44, emissive: 0xddaa44, emissiveIntensity: 0.2 });
    for (let i = 0; i < 6; i++) {
      const shell = new THREE.Mesh(shellGeo, shellMat);
      shell.position.set(
        1.7 + (i % 3 - 1) * 0.15,
        0.55 + Math.floor(i / 3) * 0.3,
        0.15 + (i % 2) * 0.2
      );
      group.add(shell);
    }

    // Team color marker
    const markerGeo = new THREE.BoxGeometry(0.8, 0.4, 0.06);
    const markerMat = new THREE.MeshPhongMaterial({ color: teamColor, emissive: teamColor, emissiveIntensity: 0.3 });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(0, 1.4, 1.3);
    group.add(marker);

    // "MU" text indicator - small glowing sphere on top
    const indicatorGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const indicatorMat = new THREE.MeshPhongMaterial({ color: 0xddaa44, emissive: 0xddaa44, emissiveIntensity: 0.5 });
    const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
    indicator.position.set(0, 2.2, 0);
    group.add(indicator);

    return group;
  }
}
