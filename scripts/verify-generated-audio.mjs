import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {GENERATED_SFX} from '../js/audio/GeneratedAudio.js';
const root=new URL('../assets/audio/generated/',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
const expected=[...GENERATED_SFX,'menu','game','combat','wind','water','distant'];
assert.deepEqual(Object.keys(manifest.assets).sort(),expected.sort());let total=0;
for(const [name,asset]of Object.entries(manifest.assets)){
 assert.equal(asset.file,name+'.ogg');const bytes=await readFile(new URL(asset.file,root));total+=bytes.length;
 assert.equal(bytes.subarray(0,4).toString(),'OggS');assert.equal(bytes.length,asset.bytes);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
 const header=bytes.indexOf(Buffer.from([1,...Buffer.from('vorbis')]));assert(header>=0);
 assert.equal(bytes.readUInt32LE(header+12),44100);assert.equal(bytes[header+11],asset.loop||asset.model.endsWith('music')?2:1);
 assert(asset.seconds>.1&&asset.seconds<120);assert(asset.decodedPeak>0&&asset.decodedPeak<=.94);assert(asset.rms>.0003);
 assert(Number.isInteger(asset.seed)&&asset.prompt.length>30);
}
assert(total<8*1024*1024);console.log(`PASS ${expected.length} generated Vorbis assets, hashes, channel layouts, sample rates, duration/peak metadata and ${(total/1024/1024).toFixed(2)} MiB download budget.`);
