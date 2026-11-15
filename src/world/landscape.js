// Shared, inexpensive organic scenery. Static geometry is batched per streamed chunk.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { photographicMaterial } from './materials.js';
import { terrainHeight } from './terrain.js';

const leafMat = new THREE.MeshStandardMaterial({ color: '#527d38', roughness: 0.92, side: THREE.DoubleSide, vertexColors: true });
const barkCanvas = document.createElement('canvas');
barkCanvas.width = barkCanvas.height = 128;
const ctx = barkCanvas.getContext('2d');
ctx.fillStyle = '#a29477'; ctx.fillRect(0, 0, 128, 128);
for (let y = 0; y < 128; y += 8) {
  ctx.fillStyle = '#776e58'; ctx.fillRect(0, y, 128, 2);
  ctx.fillStyle = '#c3b191'; ctx.fillRect(0, y + 2, 128, 1);
}
const barkMap = new THREE.CanvasTexture(barkCanvas);
barkMap.colorSpace = THREE.SRGBColorSpace;
barkMap.wrapS = barkMap.wrapT = THREE.RepeatWrapping;
barkMap.repeat.set(1, 3);
const barkMat = photographicMaterial('bark', { repeat: [1, 4], color: '#c6c0a3' });
const trunkGeo = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 0.65, 0), new THREE.Vector3(0.25, 1, 0),
), 12, 0.024, 7, false);

function frondGeometry() {
  const positions = [], colors = [];
  const triangle = (a, b, c, shade) => {
    positions.push(...a, ...b, ...c);
    for (let j = 0; j < 3; j++) colors.push(shade, shade, shade * 0.85);
  };
  for (let i = 0; i < 18; i++) {
    const t = i / 18, next = (i + 1) / 18;
    const y = 0.35 * Math.sin(t * Math.PI) - 0.4 * t * t;
    const yn = 0.35 * Math.sin(next * Math.PI) - 0.4 * next * next;
    triangle([t, y, -0.008], [next, yn, 0], [t, y, 0.008], 0.8);
    const width = Math.sin(Math.PI * (t * 0.85 + 0.1)) * 0.18 * (1 - t * 0.5);
    for (const side of [-1, 1]) {
      const root = [t, y, 0], shoulder = [t + .09, y - .035, width * side * .55];
      const tip = [t + .2, y - .12, width * side];
      const edge = [t + .12, y - .048, width * side * .53];
      triangle(root, shoulder, edge, .65 + t * .3);
      triangle(shoulder, tip, edge, .72 + t * .26);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}
const frondGeo = frondGeometry();

export function coconutPalm(group, x, z, h) {
  const trunk = new THREE.Mesh(trunkGeo, barkMat);
  trunk.position.set(x, 0, z);
  trunk.scale.set(h, h, h);
  trunk.rotation.y = x * 0.7;
  trunk.castShadow = true;
  group.add(trunk);
  const crown = new THREE.Vector3(0.25, 1, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), trunk.rotation.y).multiplyScalar(h);
  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.Mesh(frondGeo, leafMat);
    leaf.position.set(x + crown.x, h, z + crown.z);
    leaf.rotation.y = i * Math.PI * 2 / 9 + x;
    leaf.rotation.z = 0.08 + (i % 3) * 0.1;
    leaf.scale.setScalar(3.2 + (i % 3) * 0.35);
    group.add(leaf);
  }
}

const ridgeMats = ['#aab497', '#b8c0ac', '#c9cfbe'].map(color => photographicMaterial('grass', { repeat: [1, 1], color, normal: false }));
export function ghats(group, x0, width) {
  for (let layer = 0; layer < 3; layer++) {
    const geometry = new THREE.PlaneGeometry(width, 85, 20, 18);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + x0 + width / 2;
      const z = pos.getZ(i) - 74 - layer * 68;
      const height = terrainHeight(x, z, layer);
      pos.setXYZ(i, x, height, z);
      geometry.attributes.uv.setXY(i, x / 8, z / 8);
    }
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const normal = new THREE.Vector3(-(terrainHeight(x + .1, z, layer) - terrainHeight(x - .1, z, layer)) / .2,
        1, -(terrainHeight(x, z + .1, layer) - terrainHeight(x, z - .1, layer)) / .2).normalize();
      geometry.attributes.normal.setXYZ(i, normal.x, normal.y, normal.z);
    }
    const ridge = new THREE.Mesh(geometry, ridgeMats[layer]);
    ridge.receiveShadow = true;
    ridge.userData.ownedGeometry = true;
    group.add(ridge);
  }
  const trees = new THREE.InstancedMesh(canopyGeometry, canopyMaterial, 70);
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  for (let i = 0; i < 70; i++) {
    const x = x0 + Math.random() * width;
    const z = -40 - Math.random() * 65;
    const h = terrainHeight(x, z);
    const size = 1 + Math.random() * 1.2;
    dummy.position.set(x, h + size * .6, z);
    dummy.scale.set(size, size * .9, size);
    dummy.updateMatrix(); trees.setMatrixAt(i, dummy.matrix);
    trees.setColorAt(i, color.setHSL(.27 + Math.random() * .06, .24, .25 + Math.random() * .1));
  }
  group.add(trees);
}

const canopyGeometry = new THREE.IcosahedronGeometry(1, 2);
const canopyMaterial = new THREE.MeshStandardMaterial({ color: '#c6cab0', roughness: 1 });

const grassMat = new THREE.MeshStandardMaterial({ color: '#6d853e', side: THREE.DoubleSide, roughness: 1 });
const grassGeo = new THREE.ConeGeometry(0.09, 0.7, 3);
export function roadsideGrass(group, x0, density) {
  const n = Math.round(170 * density);
  const mesh = new THREE.InstancedMesh(grassGeo, grassMat, n);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < n; i++) {
    dummy.position.set(x0 + Math.random() * 40, 0.16, -3.2 - Math.random() * 3);
    dummy.scale.set(1, 0.5 + Math.random(), 1);
    dummy.rotation.set(0, Math.random() * 6, (Math.random() - 0.5) * 0.4);
    dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, color.setHSL(0.2 + Math.random() * 0.05, 0.28, 0.25 + Math.random() * 0.15));
  }
  group.add(mesh);
}

export function batchScenery(group) {
  group.updateMatrixWorld(true);
  const batches = new Map();
  group.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.dynamic || Array.isArray(o.material)) return;
    let parent = o.parent;
    while (parent && parent !== group) {
      if (parent.userData.dynamic) return;
      parent = parent.parent;
    }
    const key = `${o.material.uuid}/${o.castShadow}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(o);
  });
  for (const meshes of batches.values()) {
    // Convert both indexed primitives and custom foliage to the same attribute layout.
    const copies = meshes.map(o => {
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      if (!o.material.vertexColors) geo.deleteAttribute('color');
      geo.deleteAttribute('uv');
      // Keep UVs for mapped materials (all primitives in these groups have UVs).
      if (o.material.map || o.material.normalMap) {
        const source = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
        geo.setAttribute('uv', source.getAttribute('uv').clone());
        if (source !== o.geometry) source.dispose();
      }
      return geo;
    });
    const merged = mergeGeometries(copies);
    copies.forEach(g => g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, meshes[0].material);
    mesh.castShadow = meshes[0].castShadow;
    mesh.receiveShadow = true;
    mesh.userData.ownedGeometry = true;
    for (const o of meshes) {
      o.parent.remove(o);
      if (o.userData.ownedGeometry) o.geometry.dispose();
    }
    group.add(mesh);
  }
}
