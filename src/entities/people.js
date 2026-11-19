import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const std = (color) => new THREE.MeshStandardMaterial({ color, roughness: .86 });
const skin = [std('#895737'), std('#a87150'), std('#69452f')];
const hair = std('#24201c');
const cloth = [std('#f5e6c9'), std('#e4d8bf'), std('#9f4834')];
const gold = std('#dcad4a');
const wood = std('#603d28');
const peacock = std('#246655');
const white = std('#f4ede2');
const drumHide = std('#e4c099');
const sphere = new THREE.SphereGeometry(1, 8, 6);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
const box = new THREE.BoxGeometry();
const fan = new THREE.SphereGeometry(1, 10, 7);
const up = new THREE.Vector3(0, 1, 0);
const shapes = new Map();

function part(g, geo, material, x, y, z, sx, sy = sx, sz = sx) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  g.add(m);
  return m;
}

function limb(g, a, b, radius, material) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const mesh = part(g, cylinder, material, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, radius, d.length(), radius);
  mesh.quaternion.setFromUnitVectors(up, d.normalize());
  part(g, sphere, material, ...b, radius);
}

function head(g, material, style, y) {
  part(g, sphere, material, -.10, y, 0, .15, .21, .14);
  part(g, sphere, hair, -.07, y + .115, 0, .155, .105, .145);
  part(g, sphere, material, -.235, y - .018, 0, .035, .045, .045);
  if (style === 1) part(g, sphere, cloth[2], -.065, y + .16, 0, .17, .067, .158);
}

function batchFigure(g) {
  const groups = new Map();
  for (const p of [...g.children]) {
    p.updateMatrix();
    const geo = p.geometry.clone().applyMatrix4(p.matrix);
    if (!groups.has(p.material)) groups.set(p.material, []);
    groups.get(p.material).push(geo);
    g.remove(p);
  }
  for (const [material, parts] of groups) {
    const geometry = mergeGeometries(parts);
    parts.forEach(geo => geo.dispose());
    g.add(new THREE.Mesh(geometry, material));
  }
}

export function seatedPaappan(style, umbrella = false) {
  const key = `${style}/${umbrella}`;
  if (shapes.has(key)) return shapes.get(key).clone();
  const g = new THREE.Group();
  const tone = skin[style % skin.length];
  const bottom = cloth[style % 2];
  part(g, sphere, bottom, .02, .10, 0, .30, .16, .32);
  part(g, sphere, umbrella ? tone : cloth[1], 0, .47, 0, .165, .30, .245).rotation.z = -.105;
  part(g, cylinder, gold, 0, .245, 0, .257, .04, .255);
  limb(g, [-.035,.65,0], [-.075,.77,0], .075, tone);
  head(g, tone, style, .93);
  for (const side of [-1, 1]) {
    limb(g, [0,.18,side*.14], [-.19,.09,side*.42], .125, bottom);
    limb(g, [-.19,.09,side*.42], [-.10,-.23,side*.5], .081, tone);
    part(g, sphere, tone, -.20, -.255, side*.505, .13, .049, .075);
    limb(g, [-.01,.62,side*.20], [-.24,.39,side*.26], .062, tone);
    limb(g, [-.24,.39,side*.26], [umbrella ? -.12 : -.28,umbrella ? .68 : .24,side*.155], .048, tone);
  }
  batchFigure(g);
  shapes.set(key, g);
  return g.clone();
}

function festivalFan() {
  const g = new THREE.Group();
  part(g, cylinder, wood, 0, .22, 0, .024, .51, .024);
  part(g, fan, gold, 0, .69, 0, .46, .45, .068);
  part(g, fan, peacock, 0, .72, .034, .38, .38, .052);
  for (let i = -2; i <= 2; i++) part(g, sphere, gold, i*.128, .81 - Math.abs(i)*.047, .077, .052);
  batchFigure(g);
  return g;
}

let whiskModel;
export function festivalWhisk() {
  if (whiskModel) return whiskModel.clone();
  const g = new THREE.Group();
  part(g, cylinder, gold, 0, .17, 0, .022, .34, .022);
  for (let i = 0; i < 5; i++) part(g, sphere, white, (i-2)*.084, .48 + .027*i, 0, .086, .24, .045).rotation.z = (2-i)*.16;
  batchFigure(g);
  whiskModel = g;
  return g.clone();
}

let fanModel;
export function sharedFestivalFan() {
  fanModel ||= festivalFan();
  return fanModel.clone();
}

export function chendaPlayer() {
  const g = new THREE.Group();
  const tone = skin[1];
  const body = new THREE.Group();
  for (const x of [-.15, .16]) {
    part(body, cylinder, tone, x, .29, 0, .076, .58, .081);
    part(body, sphere, tone, x + .03, .05, .02, .091, .058, .19);
  }
  part(body, cylinder, cloth[0], 0, .56, 0, .28, .8, .21);
  part(body, cylinder, gold, 0, .25, 0, .284, .041, .215);
  part(body, sphere, tone, 0, 1.18, 0, .28, .36, .18);
  head(body, tone, 1, 1.69);
  part(body, cylinder, wood, .06, .81, .30, .191, .47, .191).rotation.z = -.19;
  part(body, cylinder, drumHide, .019, 1.05, .30, .189, .045, .189).rotation.z = -.19;
  batchFigure(body);
  g.add(body);
  const arms = [];
  for (const side of [-1, 1]) {
    const forearm = new THREE.Group();
    forearm.position.set(side*.25, 1.34, .055);
    limb(forearm, [0,0,0], [side*.06,-.25,.13], .068, tone);
    limb(forearm, [side*.06,-.25,.13], [-side*.08,-.18,.33], .056, tone);
    part(forearm, box, wood, -side*.105, -.20, .43, .026, .026, .26).rotation.y = side*.42;
    batchFigure(forearm);
    forearm.traverse(o => { if(o.isMesh) o.userData.ownedGeometry = true; });
    arms.push(forearm);
    g.add(forearm);
  }
  body.traverse(o => { if(o.isMesh) o.userData.ownedGeometry = true; });
  return { g, arms };
}
