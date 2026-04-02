import * as THREE from 'three';
import { Building } from '../entities/Building.js';
import { BUILDING_STATS } from '../core/Constants.js';

export class Wall extends Building {
  constructor(team, position, game) {
    super('wall', team, position, BUILDING_STATS.wall);
    this.game = game;
    this.armor = BUILDING_STATS.wall.armor;
    this.mesh = this.createMesh();
    this.mesh.position.copy(position);
    this.createSelectionRing(this.size * 2);
    this.createHealthBar();
    this.blocksMovement = true;
  }

  createMesh() {
    const group = new THREE.Group();
    const teamColor = this.team === 'player' ? 0x3366ff : 0xff3333;

    // Main wall section
    const wallGeo = new THREE.BoxGeometry(3.5, 2.5, 1.0);
    const wallMat = new THREE.MeshPhongMaterial({ color: 0x888877 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 1.25, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    // Foundation
    const foundGeo = new THREE.BoxGeometry(3.8, 0.3, 1.3);
    const foundMat = new THREE.MeshPhongMaterial({ color: 0x666655 });
    const foundation = new THREE.Mesh(foundGeo, foundMat);
    foundation.position.set(0, 0.15, 0);
    foundation.receiveShadow = true;
    group.add(foundation);

    // Top crenellation (battlements)
    const crenelGeo = new THREE.BoxGeometry(0.6, 0.5, 1.1);
    const crenelMat = new THREE.MeshPhongMaterial({ color: 0x999988 });
    for (let x = -1.2; x <= 1.2; x += 1.2) {
      const crenel = new THREE.Mesh(crenelGeo, crenelMat);
      crenel.position.set(x, 2.75, 0);
      crenel.castShadow = true;
      group.add(crenel);
    }

    // Team-colored stripe
    const stripeGeo = new THREE.BoxGeometry(3.6, 0.15, 1.05);
    const stripeMat = new THREE.MeshPhongMaterial({ color: teamColor });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 2.0, 0);
    group.add(stripe);

    // Damage/weathering detail (cracks)
    const crackGeo = new THREE.BoxGeometry(0.05, 1.0, 0.1);
    const crackMat = new THREE.MeshPhongMaterial({ color: 0x555544 });
    const crack1 = new THREE.Mesh(crackGeo, crackMat);
    crack1.position.set(0.8, 1.0, 0.52);
    crack1.rotation.z = 0.3;
    group.add(crack1);

    const crack2 = new THREE.Mesh(crackGeo, crackMat);
    crack2.position.set(-0.5, 1.5, 0.52);
    crack2.rotation.z = -0.2;
    group.add(crack2);

    return group;
  }

  update(deltaTime) {
    super.update(deltaTime);
  }
}
