import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS } from '../core/Constants.js';

export class SupplyExchange extends Building {
  constructor(team, position, game) {
    super('supplyexchange', team, position, BUILDING_STATS.supplyexchange);
    this.game = game;
    this.mesh = this.createMesh();
    this.mesh.position.copy(position);
    this.createSelectionRing(this.size * 2);
    this.createHealthBar();
  }

  createMesh() {
    const group = new THREE.Group();
    const teamColor = this.team === 'player' ? 0x3366ff : 0xff3333;

    // Platform base
    const baseGeo = new THREE.BoxGeometry(4, 0.2, 4);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, 0.1, 0);
    base.receiveShadow = true;
    group.add(base);

    // Main building (market/exchange hall)
    const mainGeo = new THREE.BoxGeometry(3, 2, 3);
    const mainMat = new THREE.MeshPhongMaterial({ color: 0x5a5a4a });
    const main = new THREE.Mesh(mainGeo, mainMat);
    main.position.set(0, 1.2, 0);
    main.castShadow = true;
    group.add(main);

    // Roof (pyramid-ish)
    const roofGeo = new THREE.ConeGeometry(2.5, 1.2, 4);
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x3a4a3a });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 2.8, 0);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Exchange arrows (glowing cylinders representing trade)
    const arrowMat = new THREE.MeshPhongMaterial({ color: 0x44dd88, emissive: 0x44dd88, emissiveIntensity: 0.3 });
    const arrowGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6);

    const arrow1 = new THREE.Mesh(arrowGeo, arrowMat);
    arrow1.position.set(0.8, 1.5, 1.6);
    arrow1.rotation.z = Math.PI / 2;
    group.add(arrow1);

    const arrowMat2 = new THREE.MeshPhongMaterial({ color: 0xddaa44, emissive: 0xddaa44, emissiveIntensity: 0.3 });
    const arrow2 = new THREE.Mesh(arrowGeo.clone(), arrowMat2);
    arrow2.position.set(-0.8, 1.5, 1.6);
    arrow2.rotation.z = Math.PI / 2;
    group.add(arrow2);

    // Team color marker
    const markerGeo = new THREE.BoxGeometry(0.8, 0.4, 0.06);
    const markerMat = new THREE.MeshPhongMaterial({ color: teamColor, emissive: teamColor, emissiveIntensity: 0.3 });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(0, 1.8, 1.55);
    group.add(marker);

    // Double arrow indicator on top
    const indicatorGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const indicatorMat = new THREE.MeshPhongMaterial({ color: 0x44dd88, emissive: 0x44dd88, emissiveIntensity: 0.5 });
    const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
    indicator.position.set(0, 3.6, 0);
    group.add(indicator);

    return group;
  }
}
