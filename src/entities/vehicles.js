import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const standard = (color, roughness = 0.78) => new THREE.MeshStandardMaterial({ color, roughness });
const paint = {
  red: standard('#aa2924'),
  cream: standard('#e7cd91'),
  black: standard('#232a2a'),
  rubber: standard('#222220'),
  steel: standard('#6c7471', 0.48),
  chrome: standard('#9b9e8e', 0.35),
  yellow: standard('#e9b649'),
  seat: standard('#593f31'),
  light: new THREE.MeshStandardMaterial({ color: '#f6e5b5', emissive: '#ffc168', emissiveIntensity: 0.32 }),
  tailLight: new THREE.MeshStandardMaterial({ color: '#c63820', emissive: '#dd2f15', emissiveIntensity: 0.25 }),
};
const photoMaterials = {
  'bus-side': standard('#d9b49b'),
  'bus-front': standard('#f4dab5'),
  'auto-canopy': standard('#353b38'),
  'auto-front': standard('#d6c5a0', 0.55),
  'auto-side': standard('#383d38'),
};
let routeSign;

export async function prepareVehicles() {
  const loader = new THREE.TextureLoader();
  const sign = document.createElement('canvas');
  sign.width = 256;
  sign.height = 64;
  const ctx = sign.getContext('2d');
  ctx.fillStyle = '#a42821';
  ctx.fillRect(0, 0, sign.width, sign.height);
  ctx.fillStyle = '#f6e3ad';
  ctx.font = 'bold 43px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KSRTC', 128, 47);
  const signMap = new THREE.CanvasTexture(sign);
  signMap.colorSpace = THREE.SRGBColorSpace;
  routeSign = new THREE.MeshStandardMaterial({ map: signMap, roughness: 0.83 });
  await Promise.allSettled(Object.entries(photoMaterials).map(async ([name, material]) => {
    const map = await loader.loadAsync(`/assets/vehicles/${name}.webp`);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    material.map = map;
    material.color.set('#ffffff');
    material.needsUpdate = true;
  }));
}

const box = new THREE.BoxGeometry();
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
const plane = new THREE.PlaneGeometry();
const busBody = new RoundedBoxGeometry(8.85, 2.35, 2.3, 1, 0.16);
const autoRoof = new RoundedBoxGeometry(2.18, 0.27, 1.47, 1, 0.12);
const autoBase = new RoundedBoxGeometry(2.08, 0.54, 1.40, 1, 0.13);
const autoNose = new RoundedBoxGeometry(0.78, 0.62, 1.16, 1, 0.17);

function mesh(group, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.scale.set(sx, sy, sz);
  group.add(object);
  return object;
}

function wheel(group, x, z, radius, width) {
  const rolling = new THREE.Group();
  rolling.position.set(x, radius, z);
  const tyre = mesh(rolling, cylinder, paint.rubber, 0, 0, 0, radius, width, radius);
  tyre.rotation.x = Math.PI / 2;
  const hub = mesh(rolling, cylinder, paint.steel, 0, 0, 0, radius * 0.55, width + 0.014, radius * 0.55);
  hub.rotation.x = Math.PI / 2;
  mesh(rolling, box, paint.chrome, 0, 0, width * 0.51, radius * 0.48, radius * 0.13, 0.025);
  group.add(rolling);
  group.userData.wheels.push({ rolling, radius });
}

export function makeBus() {
  const group = new THREE.Group();
  group.userData = { kind: 'bus', top: 2.95, half: 4.3, footprint: [4.6, 4.6], launch: { up: 16, forward: 9 }, wheels: [] };
  mesh(group, busBody, [paint.red, paint.cream, paint.cream, paint.black, paint.red, paint.red], 0, 1.775, 0).castShadow = true;
  const front = mesh(group, plane, photoMaterials['bus-front'], -4.43, 1.77, 0, 2.08, 1.96);
  front.rotation.y = -Math.PI / 2;
  mesh(group, plane, photoMaterials['bus-side'], 0, 1.96, 1.152, 8.54, 1.59);
  const farSide = mesh(group, plane, photoMaterials['bus-side'], 0, 1.96, -1.152, 8.54, 1.59);
  farSide.rotation.y = Math.PI;
  for (const z of [-1, 1]) {
    mesh(group, box, paint.cream, 0, 1.20, z * 1.151, 8.55, 0.073, 0.035);
    mesh(group, box, paint.black, 0, 0.65, z * 1.06, 8.65, 0.14, 0.22);
    mesh(group, box, paint.steel, -4.13, 1.91, z * 1.23, 0.13, 0.09, 0.26);
    mesh(group, box, paint.black, -4.2, 1.94, z * 1.38, 0.12, 0.24, 0.12);
    if (routeSign) {
      const sign = mesh(group, plane, routeSign, 0, 1.44, z * 1.159, 1.55, 0.38);
      sign.rotation.y = z > 0 ? 0 : Math.PI;
    }
    mesh(group, box, paint.tailLight, 4.41, 0.94, z * 0.72, 0.09, 0.22, 0.22);
    wheel(group, -2.89, z * 1.105, 0.54, 0.28);
    wheel(group, 2.86, z * 1.105, 0.54, 0.28);
  }
  mesh(group, box, paint.black, -4.35, 0.65, 0, 0.29, 0.18, 2.22);
  return group;
}

export function makeAuto(shortcut = false) {
  const group = new THREE.Group();
  group.userData = { kind: 'auto', top: 2.14, half: 0.99, center: 0.20, footprint: [1.6, 1.5], launch: { up: 12.8, forward: 16 }, wheels: [] };
  mesh(group, autoBase, paint.black, 0.2, 0.66, 0).castShadow = true;
  mesh(group, autoNose, paint.yellow, -0.95, 0.91, 0).rotation.z = -0.14;
  mesh(group, autoRoof, photoMaterials['auto-canopy'], 0.20, 2.005, 0).castShadow = true;
  const windshield = mesh(group, plane, photoMaterials['auto-front'], -0.965, 1.52, 0, 1.23, 0.80);
  windshield.rotation.set(-0.28, -Math.PI / 2, 0, 'YXZ');
  mesh(group, box, photoMaterials['auto-side'], 1.12, 1.35, 0, 0.19, 1.16, 1.33);
  mesh(group, box, paint.seat, 0.56, 1.09, 0, 0.51, 0.16, 1.23);
  mesh(group, box, paint.seat, 0.82, 1.32, 0, 0.095, 0.5, 1.23);
  for (const z of [-1, 1]) {
    mesh(group, box, paint.steel, -0.84, 1.55, z * 0.63, 0.1, 0.91, 0.075).rotation.z = -0.28;
    mesh(group, box, paint.yellow, 0.17, 0.93, z * 0.68, 1.93, 0.068, 0.075);
    mesh(group, box, photoMaterials['auto-side'], 0.83, 1.44, z * 0.64, 0.54, 0.94, 0.05);
    mesh(group, box, paint.tailLight, 1.24, 0.78, z * 0.49, 0.08, 0.14, 0.13);
    wheel(group, 0.79, z * 0.69, 0.35, 0.21);
  }
  wheel(group, -1.1, 0, 0.35, 0.22);
  mesh(group, box, paint.light, -1.35, 0.99, 0, 0.11, 0.17, 0.27);
  if (shortcut) {
    const marker = new THREE.Group();
    marker.position.set(0.2, 2.42, 0.70);
    mesh(marker, box, paint.light, -0.15, 0, 0, 0.08, 0.41, 0.07).rotation.z = Math.PI / 4;
    mesh(marker, box, paint.light, 0.15, 0, 0, 0.08, 0.41, 0.07).rotation.z = -Math.PI / 4;
    group.add(marker);
    group.userData.shortcutMarker = marker;
  }
  return group;
}
