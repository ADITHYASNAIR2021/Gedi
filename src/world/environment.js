// Ground + streamed Kerala scenery per biome: temple, pandal, flex boards, pookalam, pulikali,
// jungle, waterfall, backwaters with cheena vala, Munnar tea hills with neelakurinji.
import * as THREE from 'three';
import { Route, chapterStart, FLEX_LINES } from '../game/story.js';
import { coconutPalm, ghats, roadsideGrass, batchScenery } from './landscape.js';
import { photographicMaterial } from './materials.js';
import { pooramGate, athirappilly, alappuzhaShore, munnarPlantation, updateLandmarks } from './landmarks.js';
import { chendaPlayer } from '../entities/people.js';

const CHUNK = 40;
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });

const M = {
  trunk: std('#8a6a45'),
  leaf: std('#528044', { side: THREE.DoubleSide }),
  leafDark: std('#284f37'),
  coconut: std('#5a6b2a'),
  goldLamp: new THREE.MeshStandardMaterial({ color: '#f2c230', metalness: 0.8, roughness: 0.3, emissive: '#553300' }),
  hull: std('#5a3a22'),
  thatch: std('#c9a35a'),
  crowdHead: std('#2a1d16'),
  crowdBody: std('#ffffff'),
  tigerBody: std('#f08a1d'),
  tigerBelly: std('#ffe08a'),
  pandal: std('#3a2418'),
  bulb: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  pole: std('#444444'),
  net: new THREE.MeshBasicMaterial({ color: '#f5f0e0', wireframe: true }),
  lily: std('#3fa05a'),
  lilyFlower: std('#ff8ac0'),
  kurinji: std('#7a5bd6', { emissive: '#1a0f4a' }),
  stall: std('#b5651d'),
};

const G = {
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  sphere: new THREE.SphereGeometry(1, 14, 10),
  low: new THREE.SphereGeometry(1, 7, 5),
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 10),
  halfCyl: new THREE.CylinderGeometry(1, 1, 1, 12, 1, true, 0, Math.PI),
  disc: new THREE.CircleGeometry(1, 28),
  plane: new THREE.PlaneGeometry(1, 1),
  net: new THREE.PlaneGeometry(1, 1, 8, 8),
};

const CROWD_COLORS = ['#f4efe2', '#ae5348', '#c7a653', '#6d9294', '#ba7779', '#718c68', '#ded4bc', '#c98e68'];
const BULB_COLORS = ['#ffd23f', '#ff5a5a', '#5ad1ff', '#8aff7a', '#ff7bd5', '#ffffff'];
const POOKALAM = ['#ff8c1a', '#ffd23f', '#ffffff', '#d7263d', '#8e44ad'].map((c) => std(c));
const PHOTOS = ['/assets/gedi-boat.jpg', '/assets/gedi-dance.jpg', '/assets/gedi-thinking.jpg', '/assets/gedi-boat.jpg'];
const FLEX_BG = [['#d7263d', '#ff9a3c'], ['#1e3fae', '#3ec6ff'], ['#0f7a3a', '#c8e04a'], ['#7a1fae', '#ff6bd0']];

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, c);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function speckleTexture() {
  const t = canvasTexture(256, 256, (g) => {
    g.fillStyle = '#f2f2f2';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.5)';
      g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 2);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(70, 32);
  return t;
}

function roadTexture() {
  const t = canvasTexture(128, 64, (g) => {
    g.fillStyle = '#6b6660';
    g.fillRect(0, 0, 128, 64);
    g.fillStyle = '#f4f0e0';
    g.fillRect(16, 29, 64, 6);
  });
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(90, 1);
  return t;
}

function signTexture(text, bg, fg) {
  return canvasTexture(256, 64, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = fg;
    g.font = 'bold 30px Arial Black, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 128, 34);
  });
}

// Kerala fan-association flex board starring Gedi's real photos.
const flexMats = [];
function flexMaterial(i) {
  if (flexMats[i]) return flexMats[i];
  const lines = FLEX_LINES[i % FLEX_LINES.length];
  const [c0, c1] = FLEX_BG[i % FLEX_BG.length];
  let ctx;
  const tex = canvasTexture(512, 320, (g) => {
    ctx = g;
    const grad = g.createLinearGradient(0, 0, 512, 320);
    grad.addColorStop(0, c0);
    grad.addColorStop(1, c1);
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 320);
    g.fillStyle = '#fff8e0';
    g.fillRect(14, 14, 204, 292);
    g.textAlign = 'center';
    g.fillStyle = '#ffffff';
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    g.lineWidth = 7;
    // shrink each line until it fits beside the photo
    const line = (text, y, size, color, weight = 'Arial Black') => {
      let px = size;
      do { g.font = `bold ${px}px ${weight}, sans-serif`; px -= 2; } while (g.measureText(text).width > 268 && px > 14);
      g.fillStyle = color;
      g.strokeText(text, 366, y);
      g.fillText(text, 366, y);
    };
    line(lines[0], 96, 46, '#ffffff');
    line(lines[1], 172, 50, '#ffe14a');
    line(lines[2], 236, 26, '#ffffff', 'Arial');
    g.font = '40px serif';
    g.fillText('🐘', 366, 292);
  });
  const img = new Image();
  img.onload = () => {
    const scale = Math.max(196 / img.width, 284 / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(18, 18, 196, 284);
    ctx.clip();
    ctx.drawImage(img, 18 + (196 - w) / 2, 18 + (284 - h) * 0.3, w, h);
    ctx.restore();
    tex.needsUpdate = true;
  };
  img.src = PHOTOS[i % PHOTOS.length];
  flexMats[i] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.25 });
  return flexMats[i];
}

let chayaMat = null;
let shaapMat = null;

function add(group, geo, mat, x, y, z, sx, sy = sx, sz = sx, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.z = rz;
  group.add(m);
  return m;
}

function palm(g, x, z, h) {
  const lean = (Math.random() - 0.5) * 0.25;
  add(g, G.cyl, M.trunk, x, h / 2, z, 0.22, h, 0.22, lean);
  const tx = x - Math.sin(lean) * h * 0.5;
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(G.sphere, M.leaf);
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(tx + Math.cos(a) * 1.3, h - 0.3, z + Math.sin(a) * 1.3);
    leaf.scale.set(1.7, 0.07, 0.38);
    leaf.rotation.set(0, -a, -0.45);
    g.add(leaf);
  }
  for (let i = 0; i < 3; i++) add(g, G.low, M.coconut, tx + (i - 1) * 0.25, h - 0.45, z + 0.2, 0.2);
}

function jungleTree(g, x, z, h) {
  add(g, G.cyl, M.trunk, x, h * 0.25, z, 0.3, h * 0.5, 0.3);
  for (let i = 0; i < 3; i++) add(g, G.sphere, i % 2 ? M.leafDark : M.leaf, x + (i - 1) * h * 0.12, h * (0.55 + i * 0.14), z, h * (0.3 - i * 0.05), h * 0.24, h * (0.3 - i * 0.05));
}

function crowd(g, x0, z, tigers, density, drummers) {
  const n = density < .75 ? 36 : 60;
  const bodies = new THREE.InstancedMesh(G.sphere, M.crowdBody, n);
  const heads = new THREE.InstancedMesh(G.low, M.crowdBody, n);
  const mundus = new THREE.InstancedMesh(G.cyl, M.crowdBody, n);
  const arms = new THREE.InstancedMesh(G.cyl, M.crowdBody, n * 2);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const c = new THREE.Color();
  const axis = new THREE.Vector3(0, 0, 1);
  const skinColors = ['#845a44', '#a27151', '#66462f', '#bd8b65'];
  for (let i = 0; i < n; i++) {
    const x = x0 + Math.random() * CHUNK;
    const zz = z - Math.random() * 6;
    const height = .85 + Math.random() * .25;
    const cheer = i % 9 < 3;
    q.identity();
    m.compose(new THREE.Vector3(x, 1.15 * height, zz), q, new THREE.Vector3(.25 + (i % 5) * .019, .42 * height, .18));
    bodies.setMatrixAt(i, m);
    bodies.setColorAt(i, c.set(CROWD_COLORS[i % CROWD_COLORS.length]));
    m.compose(new THREE.Vector3(x, 1.75 * height, zz), q, new THREE.Vector3(.16, .21, .16));
    heads.setMatrixAt(i, m);
    heads.setColorAt(i, c.set(skinColors[i % skinColors.length]));
    m.compose(new THREE.Vector3(x, .42 * height, zz), q, new THREE.Vector3(.25, .83 * height, .19));
    mundus.setMatrixAt(i, m);
    for (const side of [-1, 1]) {
      q.setFromAxisAngle(axis, side * (cheer ? -.81 : .14 + i % 3 * .10));
      m.compose(new THREE.Vector3(x + side * (cheer ? .39 : .30), (cheer ? 1.46 : 1.03) * height, zz), q, new THREE.Vector3(.055, .65 * height, .057));
      const at = i * 2 + (side + 1) / 2;
      arms.setMatrixAt(at, m);
      arms.setColorAt(at, c.set(skinColors[i % skinColors.length]));
    }
  }
  const wave = new THREE.Group();
  wave.userData.dynamic = true;
  wave.add(bodies, heads, mundus, arms);
  // pulikali: Thrissur's pot-bellied tiger dancers
  for (let i = 0; i < tigers; i++) {
    const tx = x0 + 6 + Math.random() * (CHUNK - 12);
    add(wave, G.sphere, M.tigerBody, tx, 1.3, z + 1.2, 0.75, 0.95, 0.7);
    add(wave, G.sphere, M.tigerBelly, tx, 1.25, z + 1.75, 0.5, 0.6, 0.3);
    add(wave, G.sphere, M.tigerBody, tx, 2.55, z + 1.2, 0.48);
    add(wave, G.low, M.tigerBody, tx - 0.35, 2.95, z + 1.2, 0.16);
    add(wave, G.low, M.tigerBody, tx + 0.35, 2.95, z + 1.2, 0.16);
    add(wave, G.low, M.crowdHead, tx - 0.18, 2.62, z + 1.62, 0.07);
    add(wave, G.low, M.crowdHead, tx + 0.18, 2.62, z + 1.62, 0.07);
  }
  g.add(wave);
  g.userData.crowd = wave;
  if (drummers) {
    g.userData.drummers = Array.from({ length: density < .75 ? 2 : 3 }, (_, i) => {
      const player = chendaPlayer();
      player.g.userData.dynamic = true;
      player.g.position.set(x0 + 16 + i * 1.48, 0, z + 1.25 - i * .28);
      player.g.rotation.y = -.23 + i * .58;
      g.add(player.g);
      return player.arms;
    });
  }
}

function flex(g, x, z, i) {
  add(g, G.plane, flexMaterial(i), x, 5.6, z, 7.2, 4.5, 1);
  add(g, G.cyl, M.pole, x - 3.2, 2.8, z - 0.1, 0.09, 5.6, 0.09);
  add(g, G.cyl, M.pole, x + 3.2, 2.8, z - 0.1, 0.09, 5.6, 0.09);
}

function pookalam(g, x, z) {
  POOKALAM.forEach((mat, i) => {
    const d = add(g, G.disc, mat, x, 0.04 + i * 0.012, z, 2.6 - i * 0.5);
    d.rotation.x = -Math.PI / 2;
  });
}

// Pooram pandal: a tiered tower covered in coloured bulbs.
function pandal(g, x, z) {
  const tiers = [[11, 4], [8.5, 3.5], [6, 3], [3.5, 2.5]];
  const spots = [];
  let y = 0;
  for (const [w, h] of tiers) {
    add(g, G.box, M.pandal, x, y + h / 2, z, w, h, 1.2);
    for (let i = 0; i <= 10; i++) {
      spots.push([x - w / 2 + (w * i) / 10, y + h, z + 0.7], [x - w / 2 + (w * i) / 10, y + 0.3, z + 0.7]);
      if (i % 2 === 0) spots.push([x - w / 2 + (w * i) / 10, y + h / 2, z + 0.7]);
    }
    y += h;
  }
  add(g, G.cone, M.goldLamp, x, y + 1, z, 1.2, 2, 1.2);
  const bulbs = new THREE.InstancedMesh(G.low, M.bulb, spots.length);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  spots.forEach(([bx, by, bz], i) => {
    m.makeScale(0.16, 0.16, 0.16).setPosition(bx, by, bz);
    bulbs.setMatrixAt(i, m);
    bulbs.setColorAt(i, c.set(BULB_COLORS[(i + Math.floor(by)) % BULB_COLORS.length]));
  });
  g.add(bulbs);
}

function houseboat(g, x, z) {
  const b = new THREE.Group();
  b.userData.dynamic = true;
  add(b, G.box, M.hull, 0, 0.5, 0, 12, 1, 2.6);
  const roof = add(b, G.halfCyl, M.thatch, 0, 1.2, 0, 1.6, 9, 1.6);
  roof.rotation.set(0, 0, Math.PI / 2);
  b.position.set(x, 0, z);
  g.add(b);
  (g.userData.bob ||= []).push(b);
}

// Cheena vala: the cantilevered Chinese fishing nets of Kochi.
function cheenaVala(g, x, z) {
  add(g, G.cyl, M.trunk, x, 3, z, 0.12, 8, 0.12, 0.7);
  add(g, G.cyl, M.trunk, x + 1.5, 3, z, 0.12, 8, 0.12, -0.5);
  add(g, G.cyl, M.trunk, x + 0.7, 0.6, z, 0.2, 1.2, 0.2);
  const net = add(g, G.net, M.net, x - 3.6, 3.4, z, 5, 4, 1);
  net.rotation.set(-1.1, 0, 0.2);
}

function lilies(g, x0) {
  for (let i = 0; i < 9; i++) {
    const x = x0 + Math.random() * CHUNK;
    const z = -3 - Math.random() * 9;
    const pad = add(g, G.disc, M.lily, x, 0.03, z, 0.5 + Math.random() * 0.5);
    pad.rotation.x = -Math.PI / 2;
    if (i % 3 === 0) add(g, G.low, M.lilyFlower, x, 0.18, z, 0.2, 0.16, 0.2);
  }
}

function kurinji(g, x0) {
  const n = 60;
  const flowers = new THREE.InstancedMesh(G.low, M.kurinji, n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const s = 0.25 + Math.random() * 0.3;
    m.makeScale(s, s * 1.3, s).setPosition(x0 + Math.random() * CHUNK, s * 0.6, -3 - Math.random() * 14);
    flowers.setMatrixAt(i, m);
  }
  g.add(flowers);
}

function stall(g, x, z, toddy) {
  chayaMat ||= new THREE.MeshBasicMaterial({ map: signTexture('ചായ · CHAYA', '#174d3d', '#fff8e0') });
  shaapMat ||= new THREE.MeshBasicMaterial({ map: signTexture('കള്ള് ഷാപ്പ്', '#fff8e0', '#3d3527') });
  add(g, G.box, M.stall, x, 1.3, z, 5, 2.6, 2.6);
  const roof = add(g, G.halfCyl, M.thatch, x, 2.6, z, 1.7, 5.6, 1.9);
  roof.rotation.set(0, 0, Math.PI / 2);
  add(g, G.plane, toddy ? shaapMat : chayaMat, x, 2.1, z + 1.35, 3.6, 0.9, 1);
}

export class Environment {
  constructor(scene, density = 1, route = new Route()) {
    this.scene = scene;
    this.route = route;
    this.density = density;
    this.chunks = new Map();
    this.trailMat = photographicMaterial('trail', { repeat: [220, 110] });
    this.forestMat = photographicMaterial('forest', { repeat: [220, 110] });
    this.groundMat = this.trailMat;
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 600), this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    scene.add(this.ground);
    this.roadTex = roadTexture();
    this.road = new THREE.Mesh(new THREE.PlaneGeometry(700, 4), new THREE.MeshStandardMaterial({ map: this.roadTex, roughness: 0.9 }));
    this.road.rotation.x = -Math.PI / 2;
    this.road.position.set(0, 0.02, 3.6);
    this.road.receiveShadow = true;
    scene.add(this.road);
    this.groundTarget = new THREE.Color('#d2a565');
    this.waterUniforms = { time: { value: 0 } };
    this.waterMat = new THREE.MeshStandardMaterial({ color: '#367d78', roughness: 0.28, metalness: 0.4 });
    this.waterMat.onBeforeCompile = shader => {
      shader.uniforms.time = this.waterUniforms.time;
      shader.vertexShader = 'uniform float time; varying vec3 waterPos;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        transformed.z += sin(position.x * 1.8 + time * 1.2) * 0.035 + sin(position.y * 2.5 - time) * 0.025;
        waterPos = vec3(position.xy, 0.0);
      `);
      shader.fragmentShader = 'uniform float time; varying vec3 waterPos;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        float ripple = pow(max(0.0, sin(waterPos.x * 2.8 + waterPos.y * 5.5 + sin(waterPos.x * 0.4 + time) * 1.3 + time * 1.5)), 22.0);
        diffuseColor.rgb += vec3(0.045, 0.065, 0.04) * ripple;
      `);
    };
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(400, 320, 100, 60), this.waterMat);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = 0.035;
    this.water.visible = false;
    scene.add(this.water);
  }

  setBiome(cfg) {
    this.groundMat = cfg.props.includes('jungle') || cfg.props.includes('teahill') ? this.forestMat : this.trailMat;
    this.ground.material = this.groundMat;
    this.groundTarget.set(cfg.water ? '#6b8e78' : '#ffffff');
    this.road.visible = !cfg.water;
    this.water.visible = cfg.water;
    this.groundMat.roughness = cfg.water ? 0.2 : 0.95;
    this.groundMat.metalness = cfg.water ? 0.35 : 0;
  }

  buildChunk(k, chapter) {
    const g = new THREE.Group();
    const x0 = k * CHUNK;
    const { cfg, region, encore } = chapter;
    g.userData.routeKey = chapter.key;
    const props = cfg.props;
    const d = this.density;
    const has = (name) => props.includes(name);
    const every = (n, offset = 0) => ((k % n) + n) % n === offset;

    if (has('temple') && (k === 0 || every(6, 2) || k === Math.ceil(chapterStart(4) / CHUNK))) pooramGate(g, x0 + 18, -19, cfg.night);
    if (has('crowd')) crowd(g, x0, -6.5, has('pulikali') && every(2) ? 2 : 0, d, every(3));
    if (has('flex') && every(2, 1)) flex(g, x0 + 20, -13.5, ((k % 4) + 4) % 4);
    if (has('pookalam') && every(3)) pookalam(g, x0 + 10, -3.6);
    if (has('pandal') && every(4, 3)) pandal(g, x0 + 20, -22);
    if (has('palm')) for (let i = 0; i < Math.round(5 * d); i++) coconutPalm(g, x0 + Math.random() * CHUNK, -10 - Math.random() * 25, 8 + Math.random() * 6);
    if (has('jungle')) for (let i = 0; i < Math.round((region === 3 ? 3 : 7) * d); i++) jungleTree(g, x0 + Math.random() * CHUNK, -8 - Math.random() * 30, 6 + Math.random() * 7);
    const fallsChunk = Math.floor((chapter.start + 46) / CHUNK);
    if (has('waterfall') && (k === fallsChunk || (encore && every(6)))) athirappilly(g, x0 + 20, -37);
    if (has('chayakada') && every(3, 1)) stall(g, x0 + 12, -9, every(2));
    if (has('houseboat') && Math.random() < 0.8) houseboat(g, x0 + Math.random() * CHUNK, -16 - Math.random() * 14);
    if (has('cheenavala') && every(2)) cheenaVala(g, x0 + 24, -11);
    if (has('lily')) lilies(g, x0);
    if (has('teahill')) munnarPlantation(g, x0, CHUNK, d, every(3, 2));
    if (has('kurinji')) kurinji(g, x0);

    if (has('teahill')) ghats(g, x0, CHUNK);
    if (cfg.water) alappuzhaShore(g, x0, every(3, 1));
    if (!cfg.water) roadsideGrass(g, x0, d);
    if (has('temple') && every(2)) {
      const flagPoints = [];
      for (let i = 0; i <= 44; i++) flagPoints.push(new THREE.Vector3(x0 + i / 44 * 37.4, 8.85 - Math.sin(i / 44 * Math.PI) * 1.2, -10));
      const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(flagPoints), 44, .022, 4, false), M.pandal);
      cord.userData.ownedGeometry = true;
      g.add(cord);
      for (const x of [x0, x0 + 37.4]) add(g, G.cyl, M.pandal, x, 4.5, -10, .075, 9, .075);
      for (let i = 0; i < 12; i++) {
        const flag = add(g, G.plane, POOKALAM[i % POOKALAM.length], x0 + i * 3.4, 8.5 - Math.sin(i / 11 * Math.PI) * 1.2, -10, 0.45, 0.7, 1);
        flag.rotation.z = 0.12 * Math.sin(i);
      }
    }
    batchScenery(g);

    this.scene.add(g);
    return g;
  }

  update(dt, t, camX) {
    this.ground.position.x = camX;
    // Quantised origin keeps the water pattern attached to the world as the camera moves.
    this.water.position.x = Math.floor(camX / 100) * 100;
    this.waterUniforms.time.value = t;
    this.groundMat.map.offset.x = (camX / 700) * 220;
    this.groundMat.normalMap.offset.x = this.groundMat.map.offset.x;
    this.road.position.x = camX;
    this.roadTex.offset.x = (camX / 700) * 90;
    this.groundMat.color.lerp(this.groundTarget, 1 - Math.exp(-dt * 1.2));
    const from = Math.floor((camX - 70) / CHUNK);
    const to = Math.floor((camX + 150) / CHUNK);
    for (let k = from; k <= to; k++) {
      const chapter = this.route.at(Math.max(0, k * CHUNK + CHUNK / 2));
      const cached = this.chunks.get(k);
      if (cached?.userData.routeKey === chapter.key) continue;
      if (cached) this.dropChunk(cached);
      this.chunks.set(k, this.buildChunk(k, chapter));
    }
    for (const [k, g] of this.chunks) {
      if (k < from - 1 || k > to + 2) {
        this.dropChunk(g);
        this.chunks.delete(k);
        continue;
      }
      if (g.userData.bob) g.userData.bob.forEach((b, i) => { b.position.y = Math.sin(t * 1.3 + i) * 0.15; b.rotation.z = Math.sin(t + i) * 0.02; });
      updateLandmarks(g, t);
      if (g.userData.crowd) g.userData.crowd.position.y = Math.sin(t * 2) * 0.018;
      g.userData.drummers?.forEach((arms, i) => arms.forEach((arm, j) => {
        arm.rotation.x = -.14 + Math.sin(t * 8.6 + i * .12 + Math.PI * j) * .53;
      }));
    }
  }

  dropChunk(g) {
    this.scene.remove(g);
    g.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
      if (o.userData.ownedGeometry) o.geometry.dispose();
    });
  }

  reset() {
    for (const g of this.chunks.values()) this.dropChunk(g);
    this.chunks.clear();
  }
}
