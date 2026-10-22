import * as THREE from 'three';

export class EffectsManager {
  constructor(game) {
    this.game = game;
    this.scene = game.sceneManager.scene;
    this.activeEffects = [];

    // GD-129: Pre-create billboard textures for particle pooling
    // Neutral textures take their color from the material, without double tinting.
    this._fireTexture = this._createGradientTexture(0xffffff, 0xffffff);
    this._smokeTexture = this._createSmokeTexture();
    this._sparkTexture = this._createGradientTexture(0xffffff, 0xffffff);

    // GD-129: Particle pool
    this._spritePool = [];
    this._poolSize = 200;
    for (let i = 0; i < this._poolSize; i++) {
      const mat = new THREE.SpriteMaterial({ transparent: true, opacity: 1, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this._spritePool.push(sprite);
    }
  }

  _canSpawn(count = 0) {
    const quality = this.game.settingsManager?.settings?.graphics?.particles || 'high';
    const limit = quality === 'low' ? 100 : quality === 'medium' ? 240 : 500;
    let used = 0;
    for (const sprite of this._spritePool) if (sprite.visible) used++;
    return used + count <= limit && this.activeEffects.length < 180;
  }

  // GD-129: Create gradient circle texture via canvas
  _createGradientTexture(innerColor, outerColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    const ic = new THREE.Color(innerColor);
    const oc = new THREE.Color(outerColor);
    grad.addColorStop(0, `rgba(${Math.round(ic.r*255)},${Math.round(ic.g*255)},${Math.round(ic.b*255)},1)`);
    grad.addColorStop(0.5, `rgba(${Math.round(oc.r*255)},${Math.round(oc.g*255)},${Math.round(oc.b*255)},0.6)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  _createSmokeTexture() {
    // Authored cloud lobes break up circular billboards; generated once per match.
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
    const ctx=canvas.getContext('2d');
    const lobes=[[64,65,43],[40,58,29],[83,44,28],[82,83,31],[47,85,26],[56,35,24]];
    for(const [x,y,r] of lobes){
      const gradient=ctx.createRadialGradient(x,y,0,x,y,r);
      gradient.addColorStop(0,'rgba(255,255,255,.48)');
      gradient.addColorStop(.55,'rgba(230,230,230,.32)');
      gradient.addColorStop(1,'rgba(200,200,200,0)');
      ctx.fillStyle=gradient;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    return new THREE.CanvasTexture(canvas);
  }

  // Admission checks reserve room for a complete burst; never steal a live sprite.
  _getPooledSprite(texture, color, size) {
    let sprite = this._spritePool.find(s => !s.visible);
    if (!sprite) {
      const mat = new THREE.SpriteMaterial({ transparent: true, opacity: 1, depthWrite: false });
      sprite = new THREE.Sprite(mat);
      this._spritePool.push(sprite);
    }
    if (!sprite.material.map) sprite.material.needsUpdate = true;
    sprite.material.map = texture;
    sprite.material.color.set(color ?? 0xffffff);
    sprite.material.opacity = 1;
    sprite.material.blending = texture === this._smokeTexture ? THREE.NormalBlending : THREE.AdditiveBlending;
    sprite.material.rotation = Math.random() * Math.PI * 2;
    sprite.material.toneMapped = false;
    // Pool reuse must not inherit a previous smoke flag, trajectory, or position.
    sprite.position.set(0, 0, 0);
    sprite.userData = { isPooled: true, baseSize: size, isSmoke: texture === this._smokeTexture };
    sprite.scale.set(size, size, 1);
    sprite.visible = true;
    return sprite;
  }

  // GD-129: Return sprite to pool
  _returnToPool(sprite) {
    sprite.visible = false;
    if (sprite.parent) sprite.parent.remove(sprite);
  }

  // GD-133: Create shadow texture (dark ellipse with soft edges)
  _createShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(0,0,0,0.35)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(32, 32, 30, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
  }

  // GD-133: Add shadow under an entity
  createEntityShadow(entity) {
    if (!entity.mesh || entity._shadow) return;

    if (!this._shadowTexture) {
      this._shadowTexture = this._createShadowTexture();
    }

    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: this._shadowTexture,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(geo, mat);
    shadow.rotation.x = -Math.PI / 2;

    // Scale based on unit type
    let size = 3;
    if (entity.isUnit) {
      if (entity.type === 'infantry' || entity.type === 'engineer' || entity.type === 'mortar') size = 2;
      else if (entity.type === 'tank' || entity.type === 'aahalftrack' || entity.type === 'apc' || entity.type === 'scoutcar') size = 3.5;
      else if (entity.type === 'heavytank' || entity.type === 'spg' || entity.type === 'commander') size = 4;
      else if (entity.type === 'battleship' || entity.type === 'carrier') size = 6;
      else if (entity.type === 'submarine' || entity.type === 'patrolboat') size = 3;
      else if (entity.domain === 'air') size = 3;
    } else if (entity.isBuilding) {
      const bs = entity.size || 2;
      size = bs * 3;
    }
    shadow.scale.set(size, size, 1);

    entity._shadow = shadow;
    entity._shadowSize = size;
    this.scene.add(shadow);
  }

  // GD-133: Update all entity shadows
  updateShadows(entities) {
    for (const entity of entities) {
      if (!entity.alive) {
        if (entity._shadow) {
          this.scene.remove(entity._shadow);
          entity._shadow.geometry.dispose();
          entity._shadow.material.dispose();
          entity._shadow = null;
        }
        continue;
      }

      if (!entity._shadow) {
        this.createEntityShadow(entity);
      }

      if (entity._shadow && entity.mesh) {
        const pos = entity.mesh.position;
        // Shadow on ground below entity
        let groundY = 0;
        if (this.game.terrain) {
          groundY = this.game.terrain.getHeightAt(pos.x, pos.z);
        }
        entity._shadow.position.set(pos.x, groundY + 0.15, pos.z);

        // Air units: offset shadow slightly based on sun direction
        if (entity.isUnit && entity.domain === 'air') {
          entity._shadow.position.x += 2;
          entity._shadow.position.z += 2;
        }
      }
    }
  }

  createExplosion(position) {
    if (!this._canSpawn(38)) return;
    // GD-129: Billboard sprite explosion with fire + smoke
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    // Fire particles (20-30 orange/red billboards)
    const fireCount = 20 + Math.floor(Math.random() * 10);
    for (let i = 0; i < fireCount; i++) {
      const size = 1.0 + Math.random() * 1.5;
      const sprite = this._getPooledSprite(this._fireTexture, Math.random() > 0.4 ? 0xff6600 : 0xffcc00, size);
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI;
      const speed = 5 + Math.random() * 10;
      sprite.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 5,
        Math.sin(angle) * Math.cos(elevation) * speed
      );
      sprite.userData.isPooled = true;
      group.add(sprite);
      particles.push(sprite);
    }

    // Darker smoke particles that rise slowly
    const smokeCount = 8;
    for (let i = 0; i < smokeCount; i++) {
      const size = 1.5 + Math.random() * 2;
      const sprite = this._getPooledSprite(this._smokeTexture, 0x333333, size);
      sprite.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        2 + Math.random() * 3,
        (Math.random() - 0.5) * 3
      );
      sprite.userData.isPooled = true;
      sprite.userData.isSmoke = true;
      group.add(sprite);
      particles.push(sprite);
    }

    this.scene.add(group);

    this.activeEffects.push({
      type: 'explosion',
      group: group,
      particles: particles,
      lifetime: 1.35,
      elapsed: 0
    });

    // GD-129: Ground scorch mark
    this.createScorchMark(position);
    this.createImpactWave(position,5);
  }

  // One terrain-conforming draw per heavy hit, capped independently of sprites.
  createImpactWave(position, radius=4, water=false) {
    if(!this._canSpawn()||this.activeEffects.filter(e=>e.type==='impactWave').length>=12)return;
    const geometry=new THREE.PlaneGeometry(radius*2,radius*2,8,8);
    geometry.rotateX(-Math.PI/2);
    const vertices=geometry.attributes.position;
    for(let i=0;i<vertices.count;i++){
      const x=vertices.getX(i)+position.x,z=vertices.getZ(i)+position.z;
      vertices.setXYZ(i,x,water?-.16:(this.game.terrain?.getHeightAt(x,z)??position.y)+.09,z);
    }
    geometry.computeBoundingSphere();
    const material=new THREE.ShaderMaterial({
      uniforms:{uProgress:{value:0},uColor:{value:new THREE.Color(water?0xb9e3e5:0xb9a27a)}},
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec2 vUv;uniform float uProgress;uniform vec3 uColor;
        void main(){
          vec2 p=vUv*2.-1.;float r=length(p);
          float front=mix(.08,.94,sqrt(uProgress));
          float width=mix(.08,.19,uProgress);
          float band=1.-smoothstep(width*.25,width,abs(r-front));
          float breakup=.72+.28*sin(p.x*31.+sin(p.y*23.)*2.);
          float alpha=band*breakup*(1.-uProgress)*.48*(1.-smoothstep(.9,1.,r));
          gl_FragColor=vec4(uColor,alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,transparent:true,depthWrite:false,side:THREE.DoubleSide
    });
    const mesh=new THREE.Mesh(geometry,material);mesh.name=water?'Impact ripple':'Blast dust wave';
    this.scene.add(mesh);
    this.activeEffects.push({type:'impactWave',group:mesh,material,lifetime:water?1.2:.65,elapsed:0});
  }

  createMuzzleFlash(position, target, weapon = 'bullet') {
    if (weapon === 'torpedo' || !this._canSpawn(1)) return;
    // GD-129: Billboard sprite muzzle flash
    const group = new THREE.Group();
    group.position.copy(position);
    group.position.y += 2;
    if (target) {
      const direction = new THREE.Vector3().subVectors(target, position);
      direction.y = 0;
      group.position.addScaledVector(direction.normalize(), weapon === 'bullet' ? .7 : 1.8);
    }

    const flash = this._getPooledSprite(this._sparkTexture, 0xffdf91, weapon === 'bullet' ? .65 : weapon === 'laser' ? .8 : 1.8);
    flash.userData.isPooled = true;
    group.add(flash);

    this.scene.add(group);

    this.activeEffects.push({
      type: 'muzzleFlash',
      group: group,
      flash: flash,
      lifetime: 0.075,
      elapsed: 0
    });
  }

  // GD-129: Bullet impact sparks
  createBulletImpact(position) {
    if (!this._canSpawn(5)) return;
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    for (let i = 0; i < 5; i++) {
      const sprite = this._getPooledSprite(this._sparkTexture, 0xffee88, 0.3 + Math.random() * 0.3);
      sprite.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 5 + 2,
        (Math.random() - 0.5) * 8
      );
      sprite.userData.isPooled = true;
      group.add(sprite);
      particles.push(sprite);
    }

    this.scene.add(group);
    this.activeEffects.push({
      type: 'explosion',
      group,
      particles,
      lifetime: 0.3,
      elapsed: 0
    });
  }

  // GD-129: Ground scorch mark at explosion site
  createScorchMark(position) {
    if (!this._canSpawn()) return;
    if (this.activeEffects.filter(effect => effect.type === 'scorch').length >= 24) return;
    if (this.game.terrain?.isWater(position.x, position.z)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(20,15,10,0.6)');
    grad.addColorStop(0.7, 'rgba(30,25,15,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(6, 6);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.copy(position);
    plane.position.y = (this.game.terrain?.getHeightAt(position.x, position.z) ?? position.y) + .08;

    this.scene.add(plane);

    this.activeEffects.push({
      type: 'scorch',
      group: plane,
      material: mat,
      texture: texture,
      geometry: geo,
      lifetime: 10,
      elapsed: 0
    });
  }

  createHealthBar(entity) {
    const barGroup = new THREE.Group();

    // Background (red)
    const bgGeometry = new THREE.PlaneGeometry(3, 0.3);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide
    });
    const bg = new THREE.Mesh(bgGeometry, bgMaterial);
    barGroup.add(bg);

    // Foreground (green)
    const fgGeometry = new THREE.PlaneGeometry(3, 0.3);
    const fgMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide
    });
    const fg = new THREE.Mesh(fgGeometry, fgMaterial);
    fg.name = 'healthFill';
    barGroup.add(fg);

    barGroup.position.y = entity.isBuilding ? 8 : 5;

    if (entity.mesh) {
      entity.mesh.add(barGroup);
    }
    entity.healthBar = barGroup;
    return barGroup;
  }

  updateHealthBar(entity, camera) {
    if (!entity.healthBar) return;

    const ratio = entity.health / entity.maxHealth;
    const fill = entity.healthBar.getObjectByName('healthFill');
    if (fill) {
      fill.scale.x = Math.max(ratio, 0.001);
      fill.position.x = -(1 - ratio) * 1.5;

      if (ratio > 0.5) {
        fill.material.color.setHex(0x00ff00);
      } else if (ratio > 0.25) {
        fill.material.color.setHex(0xffaa00);
      } else {
        fill.material.color.setHex(0xff0000);
      }
    }

    // Billboard - face camera
    if (camera) {
      entity.healthBar.quaternion.copy(camera.quaternion);
    }
  }

  createDamageNumber(position, damage, effectiveness) {
    if (!this._canSpawn()) return;
    // effectiveness: 'high' (red), 'normal' (white), 'low' (grey)
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const dmgText = Math.round(damage).toString();
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Color by effectiveness
    let fillColor;
    if (effectiveness === 'high') {
      fillColor = '#ff3333';
    } else if (effectiveness === 'low') {
      fillColor = '#999999';
    } else {
      fillColor = '#ffffff';
    }

    // Draw text with black outline for readability
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(dmgText, 64, 32);
    ctx.fillStyle = fillColor;
    ctx.fillText(dmgText, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 1.5, 1);
    sprite.position.copy(position);
    sprite.position.y += 4;

    // Small random horizontal offset so overlapping numbers spread out
    sprite.position.x += (Math.random() - 0.5) * 1.5;
    sprite.position.z += (Math.random() - 0.5) * 1.5;

    this.scene.add(sprite);

    this.activeEffects.push({
      type: 'damageNumber',
      group: sprite,
      material: material,
      texture: texture,
      lifetime: 1.0,
      elapsed: 0,
      startY: sprite.position.y
    });
  }

  // GD-064: Gold salvage text
  createSalvageText(position, amount) {
    if (!this._canSpawn()) return;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const text = `+${amount} SP`;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(text, 64, 32);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(text, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1.0, depthTest: false, depthWrite: false, toneMapped: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3.5, 1.75, 1);
    sprite.position.copy(position);
    sprite.position.y += 5;
    this.scene.add(sprite);

    this.activeEffects.push({
      type: 'damageNumber',
      group: sprite,
      material,
      texture,
      lifetime: 1.5,
      elapsed: 0,
      startY: sprite.position.y
    });
  }

  // GD-065: Smoke particles lingering after explosions
  createSmoke(position) {
    if (!this._canSpawn(6)) return;
    const particleCount = 6;
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const size = 1.2 + Math.random() * 1.2;
      const p = this._getPooledSprite(this._smokeTexture, 0x8b8982, size);
      p.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        1 + Math.random() * 2,
        (Math.random() - 0.5) * 2
      );
      group.add(p);
      particles.push(p);
    }

    this.scene.add(group);
    this.activeEffects.push({
      type: 'smoke',
      group,
      particles,
      lifetime: 2.5,
      elapsed: 0
    });
  }

  // GD-065: Projectile trail line (enhanced with trail types)
  createProjectileTrail(from, to, trailType) {
    if (!this._canSpawn(4)) return;
    trailType = trailType || 'bullet';
    const colorMap = {
      bullet: 0xffe7ab, shell: 0xffbd6b, laser: 0x8be1ec,
      artillery: 0xff4400, torpedo: 0xaaddff
    };
    const color = colorMap[trailType] || 0xffcc44;

    const points = [from.clone(), to.clone()];
    points[0].y += 2;
    points[1].y += 2;
    points[1].y -= 1; // Match Projectile's target height.
    if (trailType === 'torpedo') points.forEach(p => p.y = -.18);
    const distance = points[0].distanceTo(points[1]);
    const geo = new THREE.BufferGeometry().setFromPoints(trailType === 'laser' ? points : [points[0], points[0]]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, depthWrite: false, toneMapped: false, opacity: .8 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    this.activeEffects.push({
      type: 'trail',
      group: line,
      material: mat,
      geometry: geo,
      lifetime: trailType === 'laser' ? .1 : Math.max(.04, distance / 80),
      from: points[0], to: points[1], beam: trailType === 'laser',
      tailFraction: Math.min(1, (trailType === 'bullet' ? 3 : 5) / Math.max(distance, .001)),
      arc: trailType === 'artillery' ? Math.min(8, distance * .18) : 0,
      head: new THREE.Vector3(), tail: new THREE.Vector3(),
      elapsed: 0
    });

    // Extra smoke puffs for artillery/shell trails
    if (trailType === 'artillery' || trailType === 'shell') {
      const dir = new THREE.Vector3().subVectors(to, from);
      const puffCount = 1;
      for (let i = 0; i < puffCount; i++) {
        const t = 0;
        const pos = from.clone().addScaledVector(dir, t);
        pos.y += 2 + Math.random();
        const sprite = this._getPooledSprite(this._smokeTexture, 0x777777, 0.5 + Math.random() * 0.4);
        sprite.position.copy(pos);
        sprite.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 1, 0.5 + Math.random(), (Math.random() - 0.5) * 1
        );
        sprite.userData.isPooled = true;
        this.scene.add(sprite);
        this.activeEffects.push({
          type: 'trailPuff',
          group: sprite,
          particles: [sprite],
          lifetime: 0.4,
          elapsed: 0
        });
      }
    }

    // Wake sprites for torpedo trails
    if (trailType === 'torpedo') {
      const dir = new THREE.Vector3().subVectors(to, from);
      for (let i = 0; i < 3; i++) {
        const t = (i + 1) / 4;
        const pos = from.clone().addScaledVector(dir, t);
        pos.y = -.18;
        const sprite = this._getPooledSprite(this._sparkTexture, 0xccddff, 0.4);
        sprite.position.copy(pos);
        sprite.userData.velocity = new THREE.Vector3(0, 0.3, 0);
        sprite.userData.isPooled = true;
        this.scene.add(sprite);
        this.activeEffects.push({
          type: 'trailPuff',
          group: sprite,
          particles: [sprite],
          lifetime: 0.3,
          elapsed: 0
        });
      }
    }
  }

  // Impact effect at hit location based on projectile trail type
  createImpactEffect(position, impactType) {
    if (!this._canSpawn(15)) return;
    impactType = impactType || 'bullet';
    if(this.activeEffects.length<179&&(impactType==='shell'||impactType==='artillery'))this.createImpactWave(position,impactType==='artillery'?5:3);
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    if (impactType === 'bullet') {
      // 3 tiny yellow sparks + tiny dust puff
      for (let i = 0; i < 3; i++) {
        const sprite = this._getPooledSprite(this._sparkTexture, 0xffee44, 0.2 + Math.random() * 0.15);
        sprite.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 6, Math.random() * 4 + 1, (Math.random() - 0.5) * 6
        );
        sprite.userData.isPooled = true;
        group.add(sprite);
        particles.push(sprite);
      }
      // dust puff
      const dust = this._getPooledSprite(this._smokeTexture, 0xbbaa88, 0.4);
      dust.userData.velocity = new THREE.Vector3(0, 1, 0);
      dust.userData.isPooled = true;
      group.add(dust);
      particles.push(dust);
      this.scene.add(group);
      this.activeEffects.push({ type: 'explosion', group, particles, lifetime: 0.2, elapsed: 0 });

    } else if (impactType === 'shell') {
      // Small explosion: 5 fire sprites + dust cloud
      for (let i = 0; i < 5; i++) {
        const sprite = this._getPooledSprite(this._fireTexture, Math.random() > 0.5 ? 0xff6600 : 0xffaa00, 0.5 + Math.random() * 0.5);
        sprite.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 5, Math.random() * 4 + 2, (Math.random() - 0.5) * 5
        );
        sprite.userData.isPooled = true;
        group.add(sprite);
        particles.push(sprite);
      }
      const dust = this._getPooledSprite(this._smokeTexture, 0x998877, 0.8);
      dust.userData.velocity = new THREE.Vector3(0, 1.5, 0);
      dust.userData.isPooled = true;
      group.add(dust);
      particles.push(dust);
      this.scene.add(group);
      this.activeEffects.push({ type: 'explosion', group, particles, lifetime: 0.65, elapsed: 0 });

    } else if (impactType === 'artillery') {
      // Medium explosion: 10 fire + 5 dirt chunks + scorch mark
      for (let i = 0; i < 10; i++) {
        const sprite = this._getPooledSprite(this._fireTexture, Math.random() > 0.3 ? 0xff4400 : 0xffcc00, 0.6 + Math.random() * 0.8);
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 6;
        sprite.userData.velocity = new THREE.Vector3(
          Math.cos(angle) * speed, Math.random() * 5 + 3, Math.sin(angle) * speed
        );
        sprite.userData.isPooled = true;
        group.add(sprite);
        particles.push(sprite);
      }
      for (let i = 0; i < 5; i++) {
        const sprite = this._getPooledSprite(this._smokeTexture, 0x665533, 0.3 + Math.random() * 0.3);
        sprite.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 8, Math.random() * 6 + 2, (Math.random() - 0.5) * 8
        );
        sprite.userData.isPooled = true;
        group.add(sprite);
        particles.push(sprite);
      }
      this.scene.add(group);
      this.activeEffects.push({ type: 'explosion', group, particles, lifetime: 0.95, elapsed: 0 });
      this.createScorchMark(position);

    } else if (impactType === 'laser') {
      // Green flash sprite
      const flash = this._getPooledSprite(this._sparkTexture, 0x8be1ec, 1.0);
      flash.userData.velocity = new THREE.Vector3(0, 0, 0);
      flash.userData.isPooled = true;
      group.add(flash);
      particles.push(flash);
      this.scene.add(group);
      this.activeEffects.push({ type: 'explosion', group, particles, lifetime: 0.15, elapsed: 0 });

    } else if (impactType === 'torpedo') {
      // Water splash: white sprites moving up then falling
      for (let i = 0; i < 6; i++) {
        const sprite = this._getPooledSprite(this._sparkTexture, 0xccddff, 0.4 + Math.random() * 0.3);
        const angle = Math.random() * Math.PI * 2;
        sprite.userData.velocity = new THREE.Vector3(
          Math.cos(angle) * 2, 4 + Math.random() * 3, Math.sin(angle) * 2
        );
        sprite.userData.isPooled = true;
        group.add(sprite);
        particles.push(sprite);
      }
      this.scene.add(group);
      this.activeEffects.push({ type: 'explosion', group, particles, lifetime: 0.5, elapsed: 0 });
    }
  }

  // Construction sparks: 2-3 small orange sparks at building position + random offset
  createConstructionSparks(position) {
    if (!this._canSpawn(3)) return;
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const sprite = this._getPooledSprite(this._sparkTexture, 0xff8800, 0.2 + Math.random() * 0.2);
      sprite.position.set(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4
      );
      sprite.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3
      );
      sprite.userData.isPooled = true;
      group.add(sprite);
      particles.push(sprite);
    }
    this.scene.add(group);
    this.activeEffects.push({ type: 'explosion', group, particles, lifetime: 0.65, elapsed: 0 });
  }

  // Dust puff on construction completion
  createConstructionDust(position) {
    if (!this._canSpawn(5)) return;
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const sprite = this._getPooledSprite(this._smokeTexture, 0xbbaa77, 0.6 + Math.random() * 0.5);
      sprite.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * 2, 1 + Math.random() * 1.5, Math.sin(angle) * 2
      );
      sprite.userData.isPooled = true;
      group.add(sprite);
      particles.push(sprite);
    }
    this.scene.add(group);
    this.activeEffects.push({ type: 'smoke', group, particles, lifetime: 0.8, elapsed: 0 });
  }

  // GD-065: Debris on building destruction
  createDebris(position) {
    if (!this._canSpawn()) return;
    const count = 8;
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    for (let i = 0; i < count; i++) {
      const size = 0.2 + Math.random() * 0.4;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshPhongMaterial({
        color: Math.random() > 0.5 ? 0x888888 : 0x664422,
        transparent: true,
        opacity: 1.0
      });
      const p = new THREE.Mesh(geo, mat);
      p.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        5 + Math.random() * 10,
        (Math.random() - 0.5) * 12
      );
      p.userData.rotSpeed = new THREE.Vector3(
        Math.random() * 5, Math.random() * 5, Math.random() * 5
      );
      group.add(p);
      particles.push(p);
    }

    this.scene.add(group);
    this.activeEffects.push({
      type: 'debris',
      group,
      particles,
      lifetime: 1.5,
      elapsed: 0
    });
  }

  // GD-065: Tank dust while moving
  createDustPuff(position) {
    if (!this._canSpawn(3)) return;
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    for (let i = 0; i < 3; i++) {
      const size = .6 + Math.random() * .6;
      const p = this._getPooledSprite(this._smokeTexture, 0xbca67e, size);
      p.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 1,
        0.5 + Math.random(),
        (Math.random() - 0.5) * 1
      );
      group.add(p);
      particles.push(p);
    }

    this.scene.add(group);
    this.activeEffects.push({
      type: 'smoke',
      group,
      particles,
      lifetime: 1.65,
      elapsed: 0
    });
  }

  // ============================
  // Cycle 15: Move Order Ground Markers
  // ============================
  createMoveMarker(position, type) {
    // type: 'move' (green) or 'attackmove' (red)
    const color = ({move:0x76e8bc,attackmove:0xff8263,attack:0xff8263,retreat:0x83c8ff,blocked:0xffcf73})[type]??0x76e8bc;

    // Pool management: reuse oldest if at max
    if (!this._moveMarkerPool) this._moveMarkerPool = [];
    if (this._moveMarkerPool.length >= 6) {
      const oldest = this._moveMarkerPool.shift();
      // Remove it from activeEffects
      const idx = this.activeEffects.indexOf(oldest);
      if (idx !== -1) {
        this.scene.remove(oldest.group);
        oldest.group.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        this.activeEffects.splice(idx, 1);
      }
    }

    const ringGeo = new THREE.RingGeometry(1.35, 1.55, 32,1,0,type==='blocked'?Math.PI*1.65:Math.PI*2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;

    // Get terrain height
    let y = 0.2;
    if (this.game.terrain) {
      y = this.game.terrain.getHeightAt(position.x, position.z) + 0.2;
    }
    ring.position.set(position.x, y, position.z);

    if(type==='attack'||type==='attackmove'||type==='retreat'||type==='blocked'){
      for(let i=0;i<2;i++){
        const tick=new THREE.Mesh(new THREE.PlaneGeometry(type==='blocked'?3.1:.18,type==='blocked'?.16:1.05),ringMat);
        tick.position.z=.01;
        if(type==='blocked')tick.rotation.z=Math.PI/4+i*Math.PI/2;
        else {tick.position.x=(i?1:-1)*.5;tick.rotation.z=(i?1:-1)*(type==='retreat'?-.7:.7);}
        ring.add(tick);
      }
    }
    this.scene.add(ring);

    const effect = {
      type: 'moveMarker',
      group: ring,
      material: ringMat,
      geometry: ringGeo,
      lifetime: .75,
      elapsed: 0
    };

    this.activeEffects.push(effect);
    this._moveMarkerPool.push(effect);
  }

  // Spec 009: Dedicated fire effect for critically damaged buildings
  // Orange/red flickering particles that rise slowly and fade (0.5-1s lifetime)
  createFireEffect(position) {
    if (!this._canSpawn(8)) return;
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    const count = 5 + Math.floor(Math.random() * 4); // 5-8 particles
    for (let i = 0; i < count; i++) {
      const color = Math.random() > 0.5 ? 0xff4400 : 0xff6600;
      const size = 0.4 + Math.random() * 0.6;
      const sprite = this._getPooledSprite(this._fireTexture, color, size);
      sprite.position.set(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5,
        (Math.random() - 0.5) * 2
      );
      sprite.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        1.5 + Math.random() * 2, // rise slowly
        (Math.random() - 0.5) * 1.5
      );
      sprite.userData.isPooled = true;
      sprite.userData.flickerPhase = Math.random() * Math.PI * 2; // random flicker offset
      group.add(sprite);
      particles.push(sprite);
    }

    this.scene.add(group);
    this.activeEffects.push({
      type: 'fire',
      group,
      particles,
      lifetime: 0.5 + Math.random() * 0.5, // 0.5-1.0s
      elapsed: 0
    });
  }

  // Spec 009: Larger death explosion (40-50 particles) for unit/building destruction
  createDeathExplosion(position) {
    if (!this._canSpawn(62)) return;
    const group = new THREE.Group();
    group.position.copy(position);
    const particles = [];

    // Fire particles: 40-50, bigger radius than regular explosion
    const fireCount = 40 + Math.floor(Math.random() * 11);
    for (let i = 0; i < fireCount; i++) {
      const size = 1.2 + Math.random() * 2.0;
      const sprite = this._getPooledSprite(
        this._fireTexture,
        Math.random() > 0.3 ? 0xff4400 : 0xffcc00,
        size
      );
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI;
      const speed = 6 + Math.random() * 14; // bigger spread
      sprite.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 7,
        Math.sin(angle) * Math.cos(elevation) * speed
      );
      sprite.userData.isPooled = true;
      group.add(sprite);
      particles.push(sprite);
    }

    // Heavier smoke cloud
    const smokeCount = 12;
    for (let i = 0; i < smokeCount; i++) {
      const size = 2.0 + Math.random() * 2.5;
      const sprite = this._getPooledSprite(this._smokeTexture, 0x222222, size);
      sprite.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        2.5 + Math.random() * 4,
        (Math.random() - 0.5) * 4
      );
      sprite.userData.isPooled = true;
      sprite.userData.isSmoke = true;
      group.add(sprite);
      particles.push(sprite);
    }

    this.scene.add(group);
    this.activeEffects.push({
      type: 'explosion',
      group,
      particles,
      lifetime: 1.65,
      elapsed: 0
    });

    this.createScorchMark(position);
    this.createImpactWave(position,7);
  }

  // Spec 009: Water splash for projectiles/units entering water
  // Blue/white particles that spray upward and fall back down
  createWaterSplash(position) {
    if (!this._canSpawn(12)) return;
    const group = new THREE.Group();
    group.position.copy(position);
    group.position.y = -.18; // Slightly above the shared terrain water plane (-.25).
    const particles = [];

    if(this.activeEffects.length<179)this.createImpactWave(position,4,true);
    const count = 8 + Math.floor(Math.random() * 5); // 8-12 particles
    for (let i = 0; i < count; i++) {
      const color = Math.random() > 0.4 ? 0xaaddff : 0xffffff;
      const size = 0.3 + Math.random() * 0.4;
      const sprite = this._getPooledSprite(this._sparkTexture, color, size);
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      sprite.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        5 + Math.random() * 4, // spray upward
        Math.sin(angle) * speed
      );
      sprite.userData.isPooled = true;
      group.add(sprite);
      particles.push(sprite);
    }

    this.scene.add(group);
    this.activeEffects.push({
      type: 'explosion', // reuse explosion update logic (gravity + fade)
      group,
      particles,
      lifetime: 0.6,
      elapsed: 0
    });
  }

  createDamageVignette() {
    // Create a full-screen red border flash using CSS overlay
    if (this._vignetteEl) return; // already active

    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none;
      z-index: 500;
      border: 4px solid rgba(255, 0, 0, 0.6);
      box-shadow: inset 0 0 60px rgba(255, 0, 0, 0.3);
      transition: opacity 0.5s;
    `;
    document.body.appendChild(el);
    this._vignetteEl = el;

    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => {
        if (el.parentElement) el.parentElement.removeChild(el);
        this._vignetteEl = null;
      }, 500);
    }, 200);
  }

  dispose() {
    for (const effect of this.activeEffects) effect.lifetime = 0;
    this.update(0);
    for (const sprite of this._spritePool) sprite.material.dispose();
    this._spritePool.length = 0;
    for (const texture of [this._fireTexture, this._smokeTexture, this._sparkTexture, this._shadowTexture]) texture?.dispose();
  }

  update(delta) {
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      effect.elapsed += delta;
      const progress = effect.lifetime <= 0 ? 1 : effect.elapsed / effect.lifetime;

      if (progress >= 1.0) {
        // Return pooled sprites before removing
        if (effect.particles) {
          for (const p of effect.particles) {
            if (p.userData && p.userData.isPooled) {
              this._returnToPool(p);
            }
          }
        }
        if (effect.flash && effect.flash.userData && effect.flash.userData.isPooled) {
          this._returnToPool(effect.flash);
        }

        // Remove completed effect
        this.scene.remove(effect.group);
        if (effect.type === 'damageNumber') {
          effect.material.dispose();
          effect.texture.dispose();
        } else if (effect.type === 'trail') {
          if (effect.material) effect.material.dispose();
          if (effect.geometry) effect.geometry.dispose();
        } else if (effect.type === 'scorch') {
          if (effect.material) effect.material.dispose();
          if (effect.texture) effect.texture.dispose();
          if (effect.geometry) effect.geometry.dispose();
        } else if (effect.type === 'moveMarker') {
          if (effect.material) effect.material.dispose();
          effect.group.traverse(child=>child.geometry?.dispose());
          // Remove from pool
          if (this._moveMarkerPool) {
            const pi = this._moveMarkerPool.indexOf(effect);
            if (pi !== -1) this._moveMarkerPool.splice(pi, 1);
          }
        } else {
          effect.group.traverse(child => {
            if (child.userData && child.userData.isPooled) return; // skip pooled sprites
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          });
        }
        this.activeEffects.splice(i, 1);
        continue;
      }

      if(effect.type==='impactWave'){
        effect.material.uniforms.uProgress.value=progress;
      } else if (effect.type === 'explosion') {
        // Expand particles outward and fade
        for (const particle of effect.particles) {
          particle.position.addScaledVector(particle.userData.velocity, delta);
          const smoke = particle.userData.isSmoke;
          if (!smoke) particle.userData.velocity.y -= 15 * delta;
          particle.position.y = Math.max(.02, particle.position.y);
          if(particle.material.map===this._fireTexture){
            // White-hot core cools to amber, then red before disappearing.
            const cooling=Math.min(1,progress*3.2);
            particle.material.color.setRGB(1, .86-cooling*.68, .4*(1-cooling));
          }
          particle.material.opacity = smoke ? Math.min(1, progress * 6) * .55 * (1 - progress) : Math.pow(1 - progress, 2);
          const scale = (particle.userData.baseSize ?? 1) * (1.0 + progress * (smoke ? 2.5 : .6));
          particle.scale.set(scale, scale, scale);
        }
      } else if (effect.type === 'muzzleFlash') {
        // Rapid fade out
        effect.flash.material.opacity = 1.0 - progress;
        const scale = effect.flash.userData.baseSize * (1.0 - progress * .65);
        effect.flash.scale.set(scale, scale, scale);
      } else if (effect.type === 'damageNumber') {
        // Float upward and fade out
        effect.group.position.y = effect.startY + progress * 4;
        effect.material.opacity = 1.0 - progress;
      } else if (effect.type === 'smoke') {
        for (const particle of effect.particles) {
          particle.position.addScaledVector(particle.userData.velocity, delta);
          particle.material.opacity = 0.6 * (1.0 - progress);
          const scale = (particle.userData.baseSize ?? 1) * (1.0 + progress * 2);
          particle.scale.set(scale, scale, scale);
        }
      } else if (effect.type === 'trail') {
        effect.material.opacity = 0.8 * (1.0 - progress);
        if (!effect.beam) {
          effect.head.lerpVectors(effect.from, effect.to, progress);
          const tailProgress = Math.max(0, progress - effect.tailFraction);
          effect.tail.lerpVectors(effect.from, effect.to, tailProgress);
          effect.head.y += Math.sin(progress * Math.PI) * effect.arc;
          effect.tail.y += Math.sin(tailProgress * Math.PI) * effect.arc;
          const positions = effect.geometry.attributes.position;
          positions.setXYZ(0, effect.tail.x, effect.tail.y, effect.tail.z);
          positions.setXYZ(1, effect.head.x, effect.head.y, effect.head.z);
          positions.needsUpdate = true;
          effect.geometry.computeBoundingSphere();
        }
      } else if (effect.type === 'debris') {
        for (const particle of effect.particles) {
          particle.position.addScaledVector(particle.userData.velocity, delta);
          particle.userData.velocity.y -= 15 * delta;
          if (particle.userData.rotSpeed) {
            particle.rotation.x += particle.userData.rotSpeed.x * delta;
            particle.rotation.y += particle.userData.rotSpeed.y * delta;
            particle.rotation.z += particle.userData.rotSpeed.z * delta;
          }
          particle.material.opacity = 1.0 - progress;
        }
      } else if (effect.type === 'trailPuff') {
        // Fade and expand small trail puffs
        for (const p of effect.particles) {
          p.position.addScaledVector(p.userData.velocity, delta);
          p.material.opacity = 0.7 * (1.0 - progress);
          const s = p.userData.baseSize * (1.0 + progress);
          p.scale.set(s, s, s);
        }
      } else if (effect.type === 'fire') {
        // Spec 009: Flickering fire particles rise and fade
        for (const particle of effect.particles) {
          particle.position.addScaledVector(particle.userData.velocity, delta);
          // Flicker: oscillate opacity for fire feel
          const flicker = 0.5 + 0.5 * Math.sin((effect.elapsed * 12) + (particle.userData.flickerPhase || 0));
          particle.material.opacity = flicker * (1.0 - progress);
          // Color shift between orange and red
          const t = 0.5 + 0.5 * Math.sin(effect.elapsed * 8 + (particle.userData.flickerPhase || 0));
          particle.material.color.setRGB(1.0, 0.2 + t * 0.4, 0.0);
          const scale = particle.userData.baseSize * (0.8 + progress * 0.6);
          particle.scale.set(scale, scale, scale);
        }
      } else if (effect.type === 'scorch') {
        // GD-129: Fade scorch marks over time
        effect.material.opacity = 0.7 * (1.0 - progress);
      } else if (effect.type === 'moveMarker') {
        // Cycle 15: Fade out + slight expand
        effect.material.opacity = 0.8 * (1.0 - progress);
        const scale = 1.0 + progress * 0.5;
        effect.group.scale.set(scale, scale, scale);
      }
    }
  }
}
