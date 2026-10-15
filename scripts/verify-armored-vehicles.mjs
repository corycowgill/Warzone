import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { AssetManager } from '../js/rendering/AssetManager.js';

const manager = new AssetManager();
for (const key of ['unit_tank', 'unit_heavytank', 'unit_apc']) {
  const info = AssetManager.MANIFEST[key];
  const bytes = await readFile(new URL('../' + info.path, import.meta.url));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const gltf = await manager.loader.parseAsync(buffer, '');
  manager.cache.set(key, { scene: gltf.scene, animations: gltf.animations });
  const player = manager.getTeamTintedModel(key, 'player');
  const enemy = manager.getTeamTintedModel(key, 'enemy');
  const meshes = [];
  player.traverse(o => { if (o.isMesh) meshes.push(o); });
  const enemyMaterials = new Map();
  enemy.traverse(o => { if (o.isMesh) enemyMaterials.set(o.material.name, o.material); });
  assert.equal(meshes.length, 6, `${key}: merged material meshes`);
  let triangles = 0;
  for (const mesh of meshes) {
    const mat = mesh.material;
    triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
    assert.ok(mesh.castShadow && mesh.receiveShadow);
    assert.ok(mat.isMeshToonMaterial, `${key}: compatible with game shading`);
    assert.notEqual(mat, enemyMaterials.get(mat.name), 'materials isolated between teams');
    if (mat.name === 'TeamColor') {
      assert.equal(mat.color.getHex(), 0x4488ff);
      assert.equal(enemyMaterials.get(mat.name).color.getHex(), 0xcc4444);
    } else {
      assert.ok(mat.color.equals(enemyMaterials.get(mat.name).color), `${key}: preserve ${mat.name}`);
    }
  }
  assert.ok(triangles <= 2000, `${key}: triangle budget (${triangles})`);
  assert.ok(bytes.length < 150_000, `${key}: download budget`);
  const bounds = new THREE.Box3().setFromObject(player);
  const size = bounds.getSize(new THREE.Vector3());
  assert.ok(Math.abs(Math.max(size.x, size.y, size.z) - info.targetSize) < 0.001);
  assert.ok(Math.abs(bounds.min.y) < 0.001, `${key}: grounded`);
  assert.ok(Math.abs(bounds.getCenter(new THREE.Vector3()).x) < 0.001);
  assert.ok(Math.abs(bounds.getCenter(new THREE.Vector3()).z) < 0.001);
  assert.ok(size.x > size.z, `${key}: +X vehicle axis`);
  console.log(`${key}: ${triangles} triangles, ${meshes.length} meshes, ${bytes.length} bytes; team colors, bounds and shadows OK`);
}
console.log('Armored vehicle integration checks passed.');
