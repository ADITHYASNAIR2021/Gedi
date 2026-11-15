// Gameplay props: collectibles, monkeys, projectiles, bus, boats, pedestals.
import * as THREE from 'three';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.83, ...extra });

const M = {
  fritter: std('#d9902a', { emissive: '#4a2400', roughness: 0.5 }),
  glass: new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, roughness: 0.1 }),
  tea: std('#b5733a', { emissive: '#3a1a00' }),
  foam: std('#f6e7c8'),
  chakka: std('#9bb53a'),
  monkey: std('#7a4a26'),
  monkeyFace: std('#e0b48a'),
  banana: std('#ffd23f', { emissive: '#4a3a00' }),
  coconut: std('#5a6b2a'),
  rock: std('#7d7466'),
  busRed: std('#c0282d'),
  tyre: std('#1a1a1a'),
  hull: std('#1f1a17'),
  rower: std('#f4efe2'),
  gold: new THREE.MeshStandardMaterial({ color: '#f2c230', metalness: 0.8, roughness: 0.25, emissive: '#5a3a00' }),
  crown: new THREE.MeshStandardMaterial({ color: '#ff4040', emissive: '#550000' }),
};

const G = {
  sphere: new THREE.SphereGeometry(1, 20, 14),
  low: new THREE.SphereGeometry(1, 7, 5),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
  box: new THREE.BoxGeometry(1, 1, 1),
  ico: new THREE.IcosahedronGeometry(1, 1),
  dodeca: new THREE.DodecahedronGeometry(1, 0),
  banana: new THREE.TorusGeometry(0.28, 0.08, 6, 10, Math.PI * 0.8),
  tailArc: new THREE.TorusGeometry(0.35, 0.04, 5, 10, Math.PI * 1.3),
  porottaSwirl: new THREE.TorusGeometry(0.25, 0.03, 5, 16),
};

function part(geo, mat, x, y, z, sx, sy = sx, sz = sx) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

export function makeFritter() {
  const g = new THREE.Group();
  g.add(part(G.sphere, M.fritter, 0, 0, 0, 0.45, 0.2, 0.3));
  return g;
}

export function makeChaya() {
  const g = new THREE.Group();
  g.add(part(G.cyl, M.tea, 0, -0.05, 0, 0.2, 0.42, 0.2));
  g.add(part(G.cyl, M.foam, 0, 0.18, 0, 0.21, 0.05, 0.21));
  g.add(part(G.cyl, M.glass, 0, 0, 0, 0.25, 0.6, 0.25));
  g.scale.setScalar(1.3);
  return g;
}

export function makeChakka() {
  const g = new THREE.Group();
  g.add(part(G.ico, M.chakka, 0, 0, 0, 0.5, 0.7, 0.5));
  g.add(part(G.cyl, M.monkey, 0, 0.75, 0, 0.05, 0.2, 0.05));
  return g;
}

export function makeBanana() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(G.banana, M.banana));
  return g;
}

export function makeCoconut() {
  const g = new THREE.Group();
  g.add(part(G.sphere, M.coconut, 0, 0, 0, 0.38, 0.42, 0.38));
  return g;
}

export function makeMonkey(boss = false) {
  const g = new THREE.Group();
  const s = boss ? 1.5 : 1;
  g.add(part(G.sphere, M.monkey, 0, 0.35 * s, 0, 0.32 * s, 0.38 * s, 0.3 * s));
  g.add(part(G.sphere, M.monkey, 0, 0.88 * s, 0, 0.27 * s));
  g.add(part(G.sphere, M.monkeyFace, 0, 0.85 * s, 0.17 * s, 0.18 * s, 0.16 * s, 0.12 * s));
  for (const side of [-1, 1]) {
    g.add(part(G.sphere, M.monkeyFace, 0.26 * s * side, 0.95 * s, 0, 0.09 * s));
    g.add(part(G.sphere, M.tyre, 0.08 * s * side, 0.92 * s, 0.26 * s, 0.035 * s));
    const thigh = part(G.sphere, M.monkey, side * .23 * s, .14 * s, .025, .14 * s, .23 * s, .14 * s);
    thigh.rotation.z = side * -.35; g.add(thigh);
    g.add(part(G.sphere, M.monkeyFace, side * .25 * s, -.07 * s, .10 * s, .10 * s, .055 * s, .17 * s));
  }
  const tail = new THREE.Mesh(G.tailArc, M.monkey);
  tail.position.set(0.35 * s, 0.4 * s, -0.1);
  tail.scale.setScalar(s);
  g.add(tail);
  const arm = new THREE.Group();
  arm.position.set(-0.28 * s, 0.55 * s, 0.05);
  arm.add(part(G.cyl, M.monkey, 0, 0.22 * s, 0, 0.06 * s, 0.45 * s, 0.06 * s));
  g.add(arm);
  g.userData.arm = arm;
  if (boss) {
    // Kuttappan wears a crown and clutches the Golden Nettipattam
    g.add(part(G.cyl, M.crown, 0, 1.3 * s, 0, 0.18 * s, 0.15 * s, 0.18 * s));
    const netti = part(G.box, M.gold, -0.45 * s, 0.5 * s, 0.25, 0.5, 0.7, 0.08);
    netti.rotation.z = 0.3;
    g.add(netti);
    g.userData.netti = netti;
  }
  return g;
}

function busTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#c0282d';
  g.fillRect(0, 0, 1024, 256);
  g.fillStyle = '#f3e3b5';
  g.fillRect(0, 30, 1024, 90);
  g.fillStyle = '#2b3d4f';
  for (let i = 0; i < 9; i++) g.fillRect(30 + i * 108, 40, 88, 70);
  g.fillStyle = '#f3e3b5';
  g.font = 'bold 64px Arial Black, sans-serif';
  g.fillText('KSRTC', 340, 200);
  g.fillStyle = '#ffd23f';
  g.fillRect(0, 128, 1024, 10);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let busMat = null;
export function makeBus() {
  busMat ||= new THREE.MeshStandardMaterial({ map: busTexture(), roughness: 0.6 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(G.box, [M.busRed, M.busRed, M.busRed, M.busRed, busMat, busMat]);
  body.scale.set(9, 2.4, 2.4);
  body.position.y = 1.7;
  body.castShadow = true;
  g.add(body);
  for (const x of [-3, 3]) {
    for (const z of [1.2, -1.2]) {
      const w = part(G.cyl, M.tyre, x, 0.5, z, 0.5, 0.3, 0.5);
      w.rotation.x = Math.PI / 2;
      g.add(w);
    }
  }
  g.userData.top = 2.9;
  g.userData.half = 4.5;
  return g;
}

export function makeBoat() {
  const g = new THREE.Group();
  g.add(part(G.box, M.hull, 0, 0.35, 0, 14, 0.5, 1.2));
  const stern = part(G.cyl, M.hull, 7.2, 1.6, 0, 0.25, 3, 0.25);
  stern.rotation.z = -0.5;
  g.add(stern);
  g.add(part(G.cyl, M.gold, 8, 3, 0, 0.3, 0.2, 0.3));
  for (let i = 0; i < 9; i++) {
    g.add(part(G.cyl, M.rower, -5.5 + i * 1.3, 0.85, 0, 0.18, 0.5, 0.18));
    g.add(part(G.sphere, M.monkey, -5.5 + i * 1.3, 1.25, 0, 0.15));
  }
  g.userData.top = 1.1;
  g.userData.half = 7;
  return g;
}

export function makePedestal(h) {
  const g = new THREE.Group();
  const rock = part(G.dodeca, M.rock, 0, h / 2 - 0.3, 0, 3.4, h / 2 + 0.3, 1.8);
  rock.receiveShadow = true;
  g.add(rock);
  return g;
}

// ---------- v2 additions ----------
const M2 = {
  autoYellow: std('#f4c20d'),
  autoBlack: std('#1c1c1c'),
  chilli: std('#2fae3a', { emissive: '#0a3a0a' }),
  chilliRed: std('#e02a1f', { emissive: '#4a0500' }),
  porotta: std('#f0d9a8', { emissive: '#3a2a10', roughness: 0.6 }),
  porottaSwirl: std('#c99a55'),
};

export function makeAuto() {
  const g = new THREE.Group();
  g.add(part(G.box, M2.autoBlack, 0, 0.75, 0, 2.4, 0.9, 1.5));
  g.add(part(G.box, M2.autoYellow, 0.1, 1.5, 0, 2.0, 0.75, 1.45));
  g.add(part(G.box, M2.autoBlack, -0.95, 1.35, 0, 0.5, 0.5, 1.3));
  for (const [x, z] of [[-1, 0], [0.8, 0.75], [0.8, -0.75]]) {
    const w = part(G.cyl, M.tyre, x, 0.32, z, 0.32, 0.22, 0.32);
    w.rotation.x = Math.PI / 2;
    g.add(w);
  }
  g.userData.top = 1.95;
  g.userData.half = 1.5;
  return g;
}

// Kanthari mulaku: fills the theri meter.
export function makeChilli() {
  const g = new THREE.Group();
  const body = part(G.sphere, M2.chilliRed, 0, 0, 0, 0.16, 0.5, 0.16);
  body.rotation.z = 0.5;
  g.add(body);
  g.add(part(G.cyl, M2.chilli, 0.22, 0.42, 0, 0.04, 0.18, 0.04));
  g.scale.setScalar(1.3);
  return g;
}

// Porotta: pazhampori magnet.
export function makePorotta() {
  const g = new THREE.Group();
  const disc = part(G.cyl, M2.porotta, 0, 0, 0, 0.5, 0.1, 0.5);
  disc.rotation.x = Math.PI / 2;
  g.add(disc);
  const swirl = new THREE.Mesh(G.porottaSwirl, M2.porottaSwirl);
  swirl.position.z = 0.06;
  g.add(swirl);
  return g;
}
