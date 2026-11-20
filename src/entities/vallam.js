import * as THREE from 'three';

const finish = new THREE.MeshStandardMaterial({ color: '#342116', roughness: .68 });
const grain = new THREE.MeshStandardMaterial({ color: '#754922', roughness: .78 });
const trim = new THREE.MeshStandardMaterial({ color: '#b18745', metalness: .24, roughness: .68 });
const linen = new THREE.MeshStandardMaterial({ color: '#e6d8aa', roughness: .94 });
const skin = new THREE.MeshStandardMaterial({ color: '#a26942', roughness: .84 });
const flag = new THREE.MeshStandardMaterial({ color: '#efbc4b', side: THREE.DoubleSide, emissive: '#553307' });
const waterline = new THREE.MeshBasicMaterial({ color: '#b0e1d5', transparent: true, opacity: .38, depthWrite: false });
const box = new THREE.BoxGeometry();
const head = new THREE.IcosahedronGeometry(1, 1);
const limb = new THREE.CylinderGeometry(1, 1, 1, 6);
const wakePlane = new THREE.PlaneGeometry();

function hullGeometry() {
  const points = [
    [-10.6, .08, 1.58], [-9.6, .32, 1.26], [-8.5, .61, 1.12],
    [-6, .83, 1.12], [0, .92, 1.12], [6.1, .77, 1.12],
    [8.2, .59, 1.12], [9.25, .37, 1.78], [10.2, .22, 2.94], [10.4, .08, 3.52],
  ];
  const position = [];
  const idx = [];
  for (const [x, w, y] of points) {
    const keel = .12 + Math.max(0, y - 1.12) * .8;
    position.push(x, y, w, x, keel, w*.71, x, keel, -w*.71, x, y, -w);
  }
  for (let i = 0; i < points.length - 1; i++) {
    for (let side = 0; side < 4; side++) {
      const a = 4*i + side, b = 4*i + (side+1)%4;
      idx.push(a, b, a+4, b, b+4, a+4);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
const hull = hullGeometry();
finish.side = THREE.DoubleSide;

function part(g, geometry, material, x, y, z, w, h = w, d = w) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  g.add(mesh);
  return mesh;
}

export const VALLAM_FOOTPRINT = [10.7, 12.7]; // Includes the visible wake behind the hull.

export function makeVallam(race = false) {
  const boat = new THREE.Group();
  boat.userData = { top: 1.13, half: 8.1, footprint: VALLAM_FOOTPRINT, launch: { up: 14.7, forward: 12.0 } };
  part(boat, hull, finish, 0, -.04, 0, 1);
  part(boat, box, grain, 0, 1.04, 0, 16.2, .18, 1.30);
  for (const z of [-.74, .74]) part(boat, box, trim, 0, 1.045, z, 16.45, .086, .055);
  for (const [x,y,w] of [[8.63,1.22,.82],[9.15,1.49,.75],[9.55,1.97,.55],[9.88,2.45,.39],[10.17,2.97,.3]]) {
    part(boat, box, trim, x, y, .005, .28, .075, w);
  }
  for (const z of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const wake = part(boat, wakePlane, waterline, 6.5 + i*2.1, .082, z * (1.05 + i*.43), 4.5 - .45*i, .09 + i*.013);
      wake.rotation.set(-Math.PI/2, 0, z*(.20 + i*.07));
    }
  }
  if (race) {
    const pole = part(boat, limb, trim, 8.47, 2.54, 0, .036, 2.02, .036);
    pole.rotation.z = -.18;
    part(boat, wakePlane, flag, 8.23, 3.35, 0, .81, .46);
  }

  const count = 20;
  const crew = {
    bodies: new THREE.InstancedMesh(head, linen, count),
    heads: new THREE.InstancedMesh(head, skin, count),
    oars: new THREE.InstancedMesh(limb, grain, count),
    blades: new THREE.InstancedMesh(box, trim, count),
  };
  for (const mesh of Object.values(crew)) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    boat.add(mesh);
  }
  boat.userData.crew = crew;
  animateVallam(boat, 0);
  return boat;
}

const dummy = new THREE.Object3D();
function transform(instances, i, x, y, z, w, h, d, rx = 0, rz = 0) {
  dummy.position.set(x, y, z);
  dummy.scale.set(w, h, d);
  dummy.rotation.set(rx, 0, rz);
  dummy.updateMatrix();
  instances.setMatrixAt(i, dummy.matrix);
}

export function animateVallam(boat, t) {
  const { bodies, heads, oars, blades } = boat.userData.crew;
  for (let i = 0; i < bodies.count; i++) {
    const seat = Math.floor(i / 2);
    const side = i % 2 ? 1 : -1;
    const x = -7.1 + seat * 1.48;
    const cycle = t * 5.4 - seat * .10;
    const reach = Math.sin(cycle);
    const recover = Math.max(0, Math.cos(cycle));
    transform(bodies, i, x + .17*reach, 1.42 - .045*reach, side*.43, .22, .32, .18, 0, -.52*reach);
    transform(heads, i, x + .29*reach, 1.76 - .075*reach, side*.43, .137, .16, .134);
    const pitch = side * (-.82 + .24*recover);
    transform(oars, i, x + .35*reach, 1.11 + .28*recover, side*.94, .032, 1.14, .032, pitch, -.36*reach);
    transform(blades, i, x + .65*reach, .68 + .40*recover, side*1.41, .13, .34, .044, pitch, -.36*reach);
  }
  for (const mesh of [bodies, heads, oars, blades]) mesh.instanceMatrix.needsUpdate = true;
}
