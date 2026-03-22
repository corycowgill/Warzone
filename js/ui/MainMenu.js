import * as THREE from 'three';

/**
 * MainMenu handles the animated 3D background scene displayed behind the main menu.
 * Creates a slowly rotating terrain flyover with military-themed elements.
 */
export class MainMenu {
  constructor(containerEl) {
    this.container = containerEl || document.getElementById('main-menu');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animationId = null;
    this.clock = new THREE.Clock();
    this.vehicles = [];
    this.active = false;

    this.init();
  }

  init() {
    // Create a separate Three.js scene for the menu background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 50, 200);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 30, 60);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.zIndex = '-1';
    this.renderer.domElement.style.pointerEvents = 'none';

    // Insert canvas behind menu content
    if (this.container) {
      this.container.style.position = 'relative';
      this.container.insertBefore(this.renderer.domElement, this.container.firstChild);
    } else {
      document.body.appendChild(this.renderer.domElement);
    }

    // Lighting
    const ambient = new THREE.AmbientLight(0x334466, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xff8844, 0.8);
    directional.position.set(50, 80, 30);
    this.scene.add(directional);

    const secondaryLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    secondaryLight.position.set(-30, 40, -20);
    this.scene.add(secondaryLight);

    // Create terrain ground
    this.createTerrain();

    // Create military vehicle silhouettes
    this.createVehicles();

    // Handle window resize
    this.onResize = () => {
      if (!this.camera || !this.renderer) return;
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this.onResize);
  }

  createTerrain() {
    // Create a simple rolling terrain using plane geometry with vertex displacement
    const size = 200;
    const segments = 50;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const height = Math.sin(x * 0.05) * 3 +
                     Math.cos(z * 0.08) * 2 +
                     Math.sin((x + z) * 0.03) * 4;
      positions.setY(i, height);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({
      color: 0x2d4a2d,
      flatShading: true
    });

    const terrain = new THREE.Mesh(geometry, material);
    this.scene.add(terrain);

    // Add some scattered "trees" (simple cones)
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 150;
      const z = (Math.random() - 0.5) * 150;
      const y = Math.sin(x * 0.05) * 3 + Math.cos(z * 0.08) * 2 + Math.sin((x + z) * 0.03) * 4;

      const treeGroup = new THREE.Group();

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2, 5);
      const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1;
      treeGroup.add(trunk);

      // Foliage
      const foliageGeo = new THREE.ConeGeometry(1.5, 4, 6);
      const foliageMat = new THREE.MeshLambertMaterial({ color: 0x1a5a1a });
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.y = 4;
      treeGroup.add(foliage);

      treeGroup.position.set(x, y, z);
      treeGroup.scale.setScalar(0.5 + Math.random() * 0.5);
      this.scene.add(treeGroup);
    }
  }

  createVehicles() {
    // Create simplified military vehicle silhouettes that orbit the scene

    // Tank
    const tank = this.createTankMesh();
    tank.position.set(20, 2, 0);
    this.scene.add(tank);
    this.vehicles.push({
      mesh: tank,
      radius: 20,
      speed: 0.15,
      angle: 0,
      heightOffset: 2
    });

    // Second tank
    const tank2 = this.createTankMesh();
    tank2.position.set(-15, 2, 15);
    this.scene.add(tank2);
    this.vehicles.push({
      mesh: tank2,
      radius: 25,
      speed: 0.12,
      angle: Math.PI * 0.7,
      heightOffset: 2
    });

    // Plane (flying overhead)
    const plane = this.createPlaneMesh();
    plane.position.set(0, 25, 0);
    this.scene.add(plane);
    this.vehicles.push({
      mesh: plane,
      radius: 40,
      speed: 0.3,
      angle: Math.PI * 0.3,
      heightOffset: 25
    });

    // Ship
    const ship = this.createShipMesh();
    ship.position.set(30, 0.5, -20);
    this.scene.add(ship);
    this.vehicles.push({
      mesh: ship,
      radius: 35,
      speed: 0.08,
      angle: Math.PI * 1.2,
      heightOffset: 0.5
    });
  }

  createTankMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4a5a3a });

    // Hull
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.2, 2),
      bodyMat
    );
    group.add(hull);

    // Turret
    const turret = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.8, 1.5),
      bodyMat
    );
    turret.position.y = 1;
    group.add(turret);

    // Barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 2.5, 6),
      new THREE.MeshLambertMaterial({ color: 0x3a3a3a })
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(1.5, 1, 0);
    group.add(barrel);

    // Tracks
    const trackMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const leftTrack = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 0.5), trackMat);
    leftTrack.position.set(0, -0.3, 1.1);
    group.add(leftTrack);

    const rightTrack = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 0.5), trackMat);
    rightTrack.position.set(0, -0.3, -1.1);
    group.add(rightTrack);

    return group;
  }

  createPlaneMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x556677 });

    // Fuselage
    const fuselage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.3, 5, 6),
      bodyMat
    );
    fuselage.rotation.z = Math.PI / 2;
    group.add(fuselage);

    // Wings
    const wingMat = new THREE.MeshLambertMaterial({ color: 0x445566 });
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.1, 6),
      wingMat
    );
    group.add(wing);

    // Tail
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.5, 0.1),
      wingMat
    );
    tail.position.set(-2.2, 0.5, 0);
    group.add(tail);

    // Tail horizontal
    const tailH = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.1, 2),
      wingMat
    );
    tailH.position.set(-2.2, 0.5, 0);
    group.add(tailH);

    return group;
  }

  createShipMesh() {
    const group = new THREE.Group();
    const hullMat = new THREE.MeshLambertMaterial({ color: 0x556666 });

    // Hull
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(6, 1.5, 2),
      hullMat
    );
    group.add(hull);

    // Superstructure
    const superstructure = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1.5, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x667777 })
    );
    superstructure.position.set(-0.5, 1.2, 0);
    group.add(superstructure);

    // Mast
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2, 4),
      new THREE.MeshLambertMaterial({ color: 0x444444 })
    );
    mast.position.set(-0.5, 2.5, 0);
    group.add(mast);

    // Gun turret
    const turret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.4, 8),
      new THREE.MeshLambertMaterial({ color: 0x555555 })
    );
    turret.position.set(1.5, 1, 0);
    group.add(turret);

    // Gun barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1.5, 4),
      new THREE.MeshLambertMaterial({ color: 0x333333 })
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(2.5, 1.2, 0);
    group.add(barrel);

    return group;
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.clock.start();
    this.animate();
  }

  stop() {
    this.active = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  animate() {
    if (!this.active) return;
    this.animationId = requestAnimationFrame(() => this.animate());

    const elapsed = this.clock.getElapsedTime();

    // Slowly orbit camera around center
    const cameraRadius = 60;
    const cameraSpeed = 0.05;
    this.camera.position.x = Math.cos(elapsed * cameraSpeed) * cameraRadius;
    this.camera.position.z = Math.sin(elapsed * cameraSpeed) * cameraRadius;
    this.camera.position.y = 25 + Math.sin(elapsed * 0.1) * 5;
    this.camera.lookAt(0, 0, 0);

    // Animate vehicles
    for (const vehicle of this.vehicles) {
      vehicle.angle += vehicle.speed * 0.016; // Approximate 60fps delta
      vehicle.mesh.position.x = Math.cos(vehicle.angle) * vehicle.radius;
      vehicle.mesh.position.z = Math.sin(vehicle.angle) * vehicle.radius;
      vehicle.mesh.position.y = vehicle.heightOffset;

      // Face movement direction
      vehicle.mesh.rotation.y = -vehicle.angle + Math.PI / 2;
    }

    this.renderer.render(this.scene, this.camera);
  }

  show() {
    if (this.renderer) {
      this.renderer.domElement.style.display = 'block';
    }
    this.start();
  }

  hide() {
    if (this.renderer) {
      this.renderer.domElement.style.display = 'none';
    }
    this.stop();
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.onResize);

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
    }

    if (this.scene) {
      this.scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}
