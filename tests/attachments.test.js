import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { buildTuskerRig, restoreTuskerRig } from '../src/entities/tusker-rig.js';
import { terrainHeight } from '../src/world/terrain.js';

function anatomy(file) {
  const bytes = readFileSync(new URL(`../public/assets/models/${file}`, import.meta.url));
  const jsonSize = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonSize).toString());
  const binary = bytes.subarray(28 + jsonSize);
  const read = index => {
    const accessor = gltf.accessors[index], view = gltf.bufferViews[accessor.bufferView];
    const count = accessor.count * (accessor.type === 'VEC3' ? 3 : 1);
    const offset = (view.byteOffset || 0) + (accessor.byteOffset || 0);
    const output = accessor.componentType === 5126 ? new Float32Array(count) : new Uint32Array(count);
    for (let i = 0; i < count; i++) output[i] = accessor.componentType === 5126 ? binary.readFloatLE(offset + i * 4) : binary.readUInt32LE(offset + i * 4);
    return output;
  };
  const scene = new THREE.Group();
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
    const material = gltf.materials[primitive.material];
    if (!material.name.includes('coat')) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(read(primitive.attributes.POSITION), 3));
    geometry.setIndex(new THREE.BufferAttribute(read(primitive.indices), 1));
    scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ name: material.name, side: THREE.DoubleSide })));
  }
  scene.updateMatrixWorld(true);
  return scene;
}

for (const file of ['kerala-tusker.glb', 'kerala-tusker-low.glb']) {
  test(`${file}: rescue root overlaps the actual belly and the drape hugs the back`, () => {
    const body = anatomy(file), rig = buildTuskerRig(body);
    assert.ok(rig.sockets.trunk.x < -2.4, 'Trunk must originate in the face region, ahead of the eyes/tusks');
    assert.ok(rig.sockets.tail.x > 1.8, 'Tail must originate in the rump region');
    assert.ok(rig.sockets.tail.x - rig.sockets.trunk.x > 4, 'Face and rump must stay on opposite ends');
    const baked = restoreTuskerRig(JSON.parse(readFileSync(new URL('../public/assets/models/kerala-tusker-rig.json', import.meta.url))));
    assert.ok(baked.sockets.belly.distanceTo(rig.sockets.belly) < 1e-5);
    for (let i = 0; i < rig.saddle.attributes.position.array.length; i++) {
      assert.ok(Math.abs(baked.saddle.attributes.position.array[i] - rig.saddle.attributes.position.array[i]) < 1e-5);
    }
    const ray = new THREE.Raycaster(new THREE.Vector3(.55, -.5, 0), new THREE.Vector3(0, 1, 0));
    const underside = ray.intersectObject(body, true)[0].point.y;
    assert.ok(Math.abs(rig.sockets.belly.y - underside - .12) < 1e-6);
    assert.ok(rig.sockets.backY > 3 && rig.sockets.backY < 4.5);
    const positions = rig.saddle.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const vertex = new THREE.Vector3().fromBufferAttribute(positions, i);
      const center = new THREE.Vector3(vertex.x, 2.6, 0);
      ray.set(vertex, center.sub(vertex).normalize());
      const contact = ray.intersectObject(body, true)[0];
      assert.ok(contact && contact.distance < .055, `Drape vertex ${i} at ${vertex.toArray()} must remain within 5.5cm of the body; distance=${contact?.distance}`);
    }
  });
}

test('terrain settles to ground at every depth edge and remains continuous at streamed X edges', () => {
  for (let layer = 0; layer < 3; layer++) {
    for (let k = -2; k < 12; k++) {
      const x = k * 40;
      assert.ok(terrainHeight(x, -116.5 - layer * 68, layer) < 1e-7);
      assert.ok(terrainHeight(x, -31.5 - layer * 68, layer) < 1e-7);
      for (let z = -110 - layer * 68; z < -35 - layer * 68; z += 10) {
        assert.ok(Math.abs(terrainHeight(x - .0001, z, layer) - terrainHeight(x + .0001, z, layer)) < .001);
      }
    }
  }
});

test('loading rejects a stale rig whose trunk points at the rump', () => {
  const data = JSON.parse(readFileSync(new URL('../public/assets/models/kerala-tusker-rig.json', import.meta.url)));
  data.sockets.trunk[0] = 2.5;
  assert.throws(() => restoreTuskerRig(data), /face.*rump/);
});
