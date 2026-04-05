import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Merge all child meshes in a THREE.Group into a single draw call.
 *
 * Strategy: collect every Mesh child, bake its material color into vertex
 * colors, apply the child's world-matrix transform to the geometry, then
 * merge everything into one BufferGeometry rendered with a single material.
 *
 * The original Group is replaced by a single Mesh inside a new Group so
 * that health bars, selection rings, etc. can still be added as siblings.
 *
 * @param {THREE.Group} group - The procedural mesh group from createMesh()
 * @returns {THREE.Group} A new Group containing one merged Mesh
 */
export function mergeGroupMeshes(group) {
  const geometries = [];
  const meshes = [];

  // Collect all Mesh children (direct and nested)
  group.traverse((child) => {
    if (child.isMesh && child !== group) {
      meshes.push(child);
    }
  });

  if (meshes.length <= 1) {
    // Nothing to merge
    return group;
  }

  // Force matrix update so child.matrixWorld is correct
  group.updateMatrixWorld(true);

  for (const mesh of meshes) {
    // Clone geometry so we don't mutate the original (some geometries are shared)
    const geom = mesh.geometry.clone();

    // Apply the mesh's local transform relative to the group root
    // (group itself is the root, so mesh.matrixWorld relative to group)
    const relativeMatrix = new THREE.Matrix4();
    relativeMatrix.copy(group.matrixWorld).invert().multiply(mesh.matrixWorld);
    geom.applyMatrix4(relativeMatrix);

    // Bake material color into vertex colors
    const color = mesh.material.color || new THREE.Color(0xffffff);
    const count = geom.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    geometries.push(geom);
  }

  let mergedGeom;
  try {
    mergedGeom = mergeGeometries(geometries, false);
  } catch (e) {
    // If merge fails (incompatible attributes), return original group
    for (const g of geometries) g.dispose();
    return group;
  }

  if (!mergedGeom) {
    for (const g of geometries) g.dispose();
    return group;
  }

  // Single material using vertex colors
  const mergedMaterial = new THREE.MeshPhongMaterial({
    vertexColors: true,
    flatShading: false
  });

  const mergedMesh = new THREE.Mesh(mergedGeom, mergedMaterial);
  mergedMesh.castShadow = true;
  mergedMesh.receiveShadow = true;

  // Create a new group with just the merged mesh
  const newGroup = new THREE.Group();
  newGroup.add(mergedMesh);

  // Copy position/rotation/scale from original group
  newGroup.position.copy(group.position);
  newGroup.rotation.copy(group.rotation);
  newGroup.scale.copy(group.scale);

  // Dispose original child geometries and materials
  for (const mesh of meshes) {
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
  }

  return newGroup;
}
