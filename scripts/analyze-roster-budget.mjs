import fs from 'node:fs';
import {AssetManager} from '../js/rendering/AssetManager.js';

console.log('| Asset | Mesh primitives | Materials | Triangles | GLB KiB |');
console.log('| --- | ---: | ---: | ---: | ---: |');
for (const [key,asset] of Object.entries(AssetManager.MANIFEST)) {
  if (!/^(unit_|bld_)/.test(key)) continue;
  const bytes=fs.readFileSync(new URL('../'+asset.path,import.meta.url));
  if (bytes.readUInt32LE(0)!==0x46546c67 || bytes.readUInt32LE(16)!==0x4e4f534a) throw Error('Invalid GLB: '+asset.path);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));
  let primitives=0,triangles=0;
  for (const mesh of gltf.meshes??[]) for (const primitive of mesh.primitives) {
    primitives++;
    if ((primitive.mode??4)!==4) continue;
    triangles+=(gltf.accessors[primitive.indices??primitive.attributes.POSITION].count)/3;
  }
  console.log(`| ${key} | ${primitives} | ${gltf.materials?.length??0} | ${triangles.toLocaleString('en-US')} | ${(bytes.length/1024).toFixed(1)} |`);
}
