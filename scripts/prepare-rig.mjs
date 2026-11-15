import { readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { buildTuskerRig } from '../src/entities/tusker-rig.js';

const bytes = readFileSync(new URL('../public/assets/models/kerala-tusker.glb', import.meta.url));
const jsonSize = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonSize));
const binary = bytes.subarray(28 + jsonSize);
function read(index) {
  const a = gltf.accessors[index], view = gltf.bufferViews[a.bufferView];
  const count = a.count * (a.type === 'VEC3' ? 3 : 1), offset = (view.byteOffset || 0) + (a.byteOffset || 0);
  const result = a.componentType === 5126 ? new Float32Array(count) : new Uint32Array(count);
  for (let i = 0; i < count; i++) result[i] = a.componentType === 5126 ? binary.readFloatLE(offset + i * 4) : binary.readUInt32LE(offset + i * 4);
  return result;
}
const root = new THREE.Group();
for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
  const mat = gltf.materials[primitive.material];
  if (!mat.name.includes('coat')) continue;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(read(primitive.attributes.POSITION), 3));
  geometry.setIndex(new THREE.BufferAttribute(read(primitive.indices), 1));
  root.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ name: mat.name, side: THREE.DoubleSide })));
}
const rig = buildTuskerRig(root);
const sockets = Object.fromEntries(Object.entries(rig.sockets).map(([key, v]) => [key, v.isVector3 ? v.toArray() : v]));
writeFileSync(new URL('../public/assets/models/kerala-tusker-rig.json', import.meta.url), JSON.stringify({
  sockets, positions: [...rig.saddle.attributes.position.array].map(v => Math.round(v * 1e6) / 1e6),
}));
