// Procedural Kerala tusker: smooth rope trunk and tail, Pooram finery and the infamous anjaamkaal.
import * as THREE from 'three';
import { Rope } from './rope.js';
import { elephantSkin, elephantTrunk, contactShadow } from '../world/materials.js';
import { createTusker, tuskerSockets, tuskerSaddle } from './tusker-model.js';
import { personalityFor } from '../game/personalities.js';
import { seatedPaappan, sharedFestivalFan, festivalWhisk } from './people.js';

let S = null; // shared geometries/materials, built lazily

function goldTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#ffe27a');
  grad.addColorStop(1, '#b8860b');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#c0392b';
  g.fillRect(0, 0, 256, 18);
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 8; col++) {
      const x = col * 32 + (row % 2 ? 16 : 0) + 8;
      const y = 34 + row * 32;
      const rg = g.createRadialGradient(x - 3, y - 3, 1, x, y, 11);
      rg.addColorStop(0, '#fff8d0');
      rg.addColorStop(0.5, '#f5c542');
      rg.addColorStop(1, '#8a6508');
      g.fillStyle = rg;
      g.beginPath();
      g.arc(x, y, 11, 0, Math.PI * 2);
      g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function zzzTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 44px sans-serif';
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#3a4a8a';
  g.lineWidth = 6;
  g.strokeText('z Z', 10, 48);
  g.fillText('z Z', 10, 48);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function shared() {
  if (S) return S;
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...extra });
  S = {
    sphere: new THREE.SphereGeometry(1, 22, 16),
    low: new THREE.SphereGeometry(1, 10, 8),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
    leg: new THREE.CylinderGeometry(0.42, 0.5, 1.9, 12),
    tusk: new THREE.TorusGeometry(0.7, 0.09, 8, 14, Math.PI * 0.55),
    cloth: new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, 0.95),
    netti: new THREE.SphereGeometry(1.07, 18, 12, -0.95, 1.9, 0.3, 1.6),
    cone: new THREE.ConeGeometry(1.5, 0.6, 18, 1, true),
    ring: new THREE.CylinderGeometry(1.5, 1.5, 0.2, 18, 1, true),
    bangle: new THREE.TorusGeometry(1, 0.3, 6, 14),
    skin: std('#37332f', { bumpMap: elephantSkin(), bumpScale: 0.065 }),
    skinBaby: std('#30342f', { bumpMap: elephantSkin(), bumpScale: 0.05 }),
    trunkSkin: std('#a88f80', { map: elephantTrunk(), bumpMap: elephantSkin(), bumpScale: .05 }),
    earInner: std('#c79a9a'),
    pinkSpot: std('#c9958f'),
    sneezeNose: std('#e05a5a'),
    ivory: std('#f6eed8', { roughness: 0.4 }),
    black: std('#111111', { roughness: 0.3 }),
    white: std('#ffffff'),
    toe: std('#ddd5c2'),
    anjaam: std('#8d7480'),
    anjaamTip: std('#e08a9c', { roughness: 0.5 }),
    gold: new THREE.MeshStandardMaterial({ map: goldTexture(), metalness: 0.75, roughness: 0.35, emissive: '#3a2a00', side: THREE.DoubleSide }),
    goldPlain: new THREE.MeshStandardMaterial({ color: '#f2c230', metalness: 0.8, roughness: 0.3, emissive: '#3a2600' }),
    clothColors: ['#c0392b', '#8e44ad', '#d35400', '#1e8449', '#2e86c1'].map((c) => std(c, { side: THREE.DoubleSide })),
    parasolColors: ['#e74c3c', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ff4fa3'].map((c) => std(c, { side: THREE.DoubleSide, roughness: 0.6 })),
    zzz: new THREE.SpriteMaterial({ map: zzzTexture(), transparent: true, depthWrite: false }),
  };
  return S;
}

function mesh(geo, mat, x, y, z, sx, sy = sx, sz = sx, shadow = false) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = shadow;
  return m;
}

const tmp = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();

export class Elephant {
  constructor({ variant = 'normal', decorated = false, parasol = false, cloth = 0, name = 'Kannan', anjaam = false } = {}) {
    const s = shared();
    this.variant = variant;
    this.name = name;
    this.personality = personalityFor(variant, name);
    this.scale = variant === 'baby' ? 0.75 : 1;
    this.phase = Math.random() * 10;
    this.group = new THREE.Group();
    this.group.scale.setScalar(this.scale);
    this.baseX = 0;
    this.sway = 0;
    this.droop = 0;
    this.held = null;
    this.hands = new THREE.Vector3();
    this.trumpetT = 0;
    this.sneezed = false;
    this.anjaamReady = anjaam;
    this.anjaamExt = 0;
    this.twang = 0;
    this.trunkBase = new THREE.Vector3(-2.95, 2.85, 0);
    this.trunkCtrl = new THREE.Vector3(-4.7, 2.2, 0.35);
    this.trunkRest = new THREE.Vector3(-4.5, 5.9, 0.6);
    this.tailBase = new THREE.Vector3(2.35, 3.05, 0);
    this.tailCtrl = new THREE.Vector3(3.3, 2.5, 0.3);
    this.tailRest = new THREE.Vector3(3.5, 4.7, 0.5);
    this.anjaamBase = new THREE.Vector3(0.55, 1.2, 0);
    const skin = variant === 'baby' ? s.skinBaby : s.skin;
    const g = this.group;
    this.contact = contactShadow(8, 4.5);
    g.add(this.contact);
    const fancy = decorated;
    const detailed = createTusker();
    const sockets = detailed ? tuskerSockets() : null;
    if (sockets) {
      this.anjaamBase.copy(sockets.belly);
      this.trunkBase.copy(sockets.trunk);
      this.tailBase.copy(sockets.tail);
    }
    const anatomyStart = g.children.length;

    g.add(mesh(s.sphere, skin, 0, 2.6, 0, 2.4, 1.55, 1.35, true));
    this.legs = [];
    for (const [lx, lz] of [[-1.5, 0.65], [-1.5, -0.65], [1.5, 0.65], [1.5, -0.65]]) {
      const leg = new THREE.Group();
      leg.position.set(lx, 1.9, lz);
      const shin = new THREE.Mesh(s.leg, skin);
      shin.position.y = -0.95;
      shin.castShadow = true;
      leg.add(shin);
      leg.add(mesh(s.cyl, s.toe, 0, -1.85, 0.05, 0.52, 0.1, 0.52));
      if (fancy) leg.add(mesh(s.cyl, s.goldPlain, 0, -1.45, 0, 0.52, 0.14, 0.52));
      g.add(leg);
      this.legs.push(leg);
    }

    const head = new THREE.Group();
    head.position.set(-2.3, 3.3, 0);
    head.scale.set(1, 1.05, 0.95);
    head.add(mesh(s.sphere, skin, 0, 0, 0, 1.05, 1.05, 1.05, true));
    for (const side of [1, -1]) head.add(mesh(s.sphere, skin, 0.05, 0.72, 0.36 * side, 0.5, 0.45, 0.42));
    if (fancy) head.add(new THREE.Mesh(s.netti, s.gold));
    g.add(head);

    this.ears = [];
    this.eyes = [];
    for (const side of [1, -1]) {
      const ear = new THREE.Group();
      ear.position.set(-1.85, 3.45, 0.85 * side);
      ear.add(mesh(s.sphere, skin, 0.35, -0.2, 0.08 * side, 0.95, 1.15, 0.16));
      ear.add(mesh(s.sphere, s.earInner, 0.35, -0.2, 0.0, 0.75, 0.95, 0.1));
      g.add(ear);
      this.ears.push(ear);
      const eye = mesh(s.sphere, s.black, -2.9, 3.6, 0.62 * side, 0.12);
      g.add(eye);
      this.eyes.push(eye);
      g.add(mesh(s.sphere, s.white, -2.96, 3.65, 0.69 * side, 0.04));
      if (variant !== 'baby') {
        const tusk = mesh(s.tusk, s.ivory, -2.75, 2.3, 0.45 * side, 1);
        tusk.rotation.set(0, 0, Math.PI * 0.65);
        g.add(tusk);
      }
    }
    g.add(mesh(s.sphere, s.pinkSpot, -2.6, 3.0, 0.55, 0.35, 0.3, 0.2));

    if (detailed) {
      g.children.slice(anatomyStart).forEach(part => g.remove(part));
      this.ears = []; this.eyes = []; this.legs = [];
      this.anatomy = detailed;
      detailed.traverse(part => {
        if (!part.isMesh) return;
        part.onBeforeRender = () => {
          const uniforms = part.material.userData.shader?.uniforms;
          if (uniforms) {
            uniforms.tuskerTime.value = this.animationTime || 0;
            uniforms.tuskerMood.value = this.personality === personalityFor('playful') ? 2.5 : this.variant === 'sleepy' ? .65 : 1.3;
          }
        };
      });
      g.add(detailed);
      if (fancy) {
        const netti = mesh(s.netti, s.gold, -2.65, 3.1, 0, .85, .9, .9);
        netti.rotation.y = -Math.PI / 2;
        g.add(netti);
      }
    }

    if (fancy || cloth) {
      const mat = s.clothColors[(cloth || Math.floor(Math.random() * 5)) % s.clothColors.length];
      if (detailed && tuskerSaddle()) g.add(new THREE.Mesh(tuskerSaddle(), mat));
      else g.add(mesh(s.cloth, mat, 0, 2.6, 0, 2.47, 1.6, 1.39));
    }

    // trunk: tube + gold nettipattam sleeve + grab bangle at the tip
    this.trunkJoin = mesh(s.sphere, skin, this.trunkBase.x + .05, this.trunkBase.y + .08, this.trunkBase.z, .42, .43, .38);
    g.add(this.trunkJoin);
    this.ribbonMat = new THREE.MeshStandardMaterial({ color: this.personality.color, roughness: .85 });
    g.add(mesh(s.cyl, this.ribbonMat, detailed ? -1.77 : -1.5, .55, detailed ? .57 : .65, .32, .1, .32));
    const trunkSkin = detailed && variant !== 'baby' ? s.trunkSkin : skin;
    this.trunk = new Rope(trunkSkin, { segments: 22, radial: 10, r0: 0.47, r1: 0.17, shadow: true });
    g.add(this.trunk.mesh);
    this.nettiRope = null;
    if (fancy) {
      this.nettiRope = new Rope(s.gold, { segments: 8, radial: 8, r0: 0.51, r1: 0.39, arc: Math.PI * 1.08 });
      g.add(this.nettiRope.mesh);
    }
    this.trunkTip = mesh(s.low, variant === 'sneezy' ? s.sneezeNose : trunkSkin, 0, 0, 0, variant === 'sneezy' ? 0.3 : 0.2);
    this.trunkBangle = mesh(s.bangle, s.goldPlain, 0, 0, 0, 0.24);
    this.trunkBangle.rotation.x = Math.PI / 2;
    g.add(this.trunkTip, this.trunkBangle);

    this.tail = new Rope(skin, { segments: 10, radial: 5, r0: 0.11, r1: 0.05 });
    g.add(mesh(s.sphere, skin, this.tailBase.x, this.tailBase.y - .06, this.tailBase.z, .23, .32, .25));
    this.tailTip = mesh(s.low, s.black, 0, 0, 0, 0.18);
    this.tailBangle = mesh(s.bangle, s.goldPlain, 0, 0, 0, 0.13);
    this.tailBangle.rotation.x = Math.PI / 2;
    g.add(this.tail.mesh, this.tailTip, this.tailBangle);

    // anjaamkaal: retracted stub by default, dangles when the elephant is feeling helpful
    this.anjaam = null;
    if (variant !== 'baby') {
      g.add(mesh(s.sphere, skin, this.anjaamBase.x, this.anjaamBase.y + .035, this.anjaamBase.z, .26, .20, .24));
      this.anjaam = new Rope(s.anjaam, { segments: 10, radial: 7, r0: 0.22, r1: 0.16 });
      this.anjaamTip = mesh(s.low, s.anjaamTip, 0, 0, 0, 0.2);
      g.add(this.anjaam.mesh, this.anjaamTip);
    } else {
      this.anjaamReady = false;
    }

    this.parasol = null;
    const backY = sockets ? sockets.backY + .025 : 4.1;
    if (fancy) {
      this.paappan = seatedPaappan((cloth ?? 1) % 3);
      this.paappan.position.set(-.48, backY + .10, 0);
      g.add(this.paappan);
    }
    if (parasol) {
      const rider = new THREE.Group();
      rider.position.set(0.4, backY, 0);
      const umbrellaRider = seatedPaappan(1, true);
      umbrellaRider.position.set(.04, .06, 0);
      rider.add(umbrellaRider);
      rider.add(mesh(s.cyl, s.goldPlain, 0.15, 1.3, 0, 0.035, 2.0, 0.035));
      const umb = new THREE.Group();
      umb.position.set(0.15, 2.45, 0);
      const color = s.parasolColors[Math.floor(Math.random() * s.parasolColors.length)];
      umb.add(new THREE.Mesh(s.cone, color));
      umb.add(mesh(s.ring, s.goldPlain, 0, -0.35, 0, 1, 1, 1));
      umb.add(mesh(s.sphere, s.goldPlain, 0, 0.38, 0, 0.16));
      rider.add(umb);
      const fanRider = seatedPaappan(2, true);
      fanRider.position.set(.88, .02, 0);
      this.fan = sharedFestivalFan();
      this.fan.position.set(.53, .54, .30);
      this.whisk = festivalWhisk();
      this.whisk.position.set(.51, .57, -.28);
      rider.add(fanRider, this.fan, this.whisk);
      g.add(rider);
      this.parasol = umb;
      this.parasolLocal = new THREE.Vector3(0.55, backY + 2.75, 0);
    }

    this.zzz = null;
    if (variant === 'sleepy') {
      this.zzz = new THREE.Sprite(s.zzz);
      this.zzz.scale.set(1.4, 0.7, 1);
      this.zzz.position.set(-2.2, 5, 0.5);
      g.add(this.zzz);
    }

    this.trunkAnchor = { el: this, kind: 'trunk', pos: new THREE.Vector3(), vel: new THREE.Vector3() };
    this.tailAnchor = { el: this, kind: 'tail', pos: new THREE.Vector3(), vel: new THREE.Vector3() };
    this.anchors = [this.trunkAnchor, this.tailAnchor];
    this.trunkEnd = this.trunkRest.clone();
    this.tailEnd = this.tailRest.clone();
  }

  place(x, y = 0) {
    this.baseX = x;
    this.group.position.set(x, y, 0);
  }

  hold(kind) {
    this.held = kind;
    this.trumpetT = 0.6;
  }

  release() {
    this.held = null;
  }

  setHands(world) {
    this.hands.copy(world);
  }

  // The anjaamkaal has done its duty: retract with a wobble.
  useAnjaam() {
    this.held = null;
    this.anjaamReady = false;
    this.twang = 0.8;
  }

  anjaamWorld(out) {
    return this.group.localToWorld(out.copy(this.anjaamBase));
  }

  parasolTop() {
    if (!this.parasol) return null;
    this.group.localToWorld(tmp.copy(this.parasolLocal));
    return { x: tmp.x, y: tmp.y, r: 1.6 * this.scale };
  }

  update(dt, t) {
    const g = this.group;
    const p = t + this.phase;
    this.animationTime = p;
    g.position.x = this.baseX + Math.sin(p * 0.6) * this.sway;
    this.trumpetT = Math.max(0, this.trumpetT - dt);
    const excited = this.trumpetT / 0.6;
    this.ears.forEach((e, i) => { e.rotation.y = (i ? -1 : 1) * (Math.sin(p * 3 + i) * 0.3 + excited * 0.5); });
    this.legs.forEach((l, i) => { l.rotation.z = Math.sin(p * 2.2 + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0)) * 0.1; });
    const blink = this.variant === 'sleepy' || (p % 3.7) < 0.12 ? 0.15 : 1;
    this.eyes.forEach((e) => { e.scale.y = 0.12 * blink; });
    if (this.parasol) this.parasol.rotation.y += dt * 1.5;
    if (this.paappan) this.paappan.rotation.z = Math.sin(p * 1.65) * .04;
    if (this.fan) {
      this.fan.rotation.z = Math.sin(p * 2.7) * .25;
      this.fan.rotation.y = Math.sin(p * 2.0) * .26;
      this.whisk.rotation.z = Math.sin(p * 2.7 + .9) * .41;
    }
    if (this.zzz) {
      this.zzz.position.y = 5 + ((p * 0.6) % 1) * 0.8;
      this.zzz.material.opacity = 1 - ((p * 0.6) % 1);
    }
    if (this.variant === 'sleepy') {
      this.droop = this.held === 'trunk' ? Math.min(this.droop + dt * 0.7, 1.8) : Math.max(this.droop - dt * 1.5, 0);
    }
    const lift = Math.sin(Math.min(excited, 1) * Math.PI) * 0.6;
    const playful = this.personality.label === 'KURUMBI';
    const wiggle = Math.sin(p * (playful ? 2.5 : 1.2)) * (playful ? .18 : .065);
    g.updateMatrixWorld();

    // trunk
    const rest = tmpB.copy(this.trunkRest);
    rest.y += lift + wiggle - this.droop;
    rest.x += wiggle * 0.5;
    const oldTrunkX = this.trunkAnchor.pos.x, oldTrunkY = this.trunkAnchor.pos.y;
    g.localToWorld(this.trunkAnchor.pos.copy(rest));
    if (dt > 0) this.trunkAnchor.vel.set((this.trunkAnchor.pos.x - oldTrunkX) / dt, (this.trunkAnchor.pos.y - oldTrunkY) / dt, 0);
    const heldTrunk = this.held === 'trunk';
    const trunkTarget = heldTrunk ? g.worldToLocal(tmp.copy(this.hands)) : rest;
    this.trunkEnd.lerp(trunkTarget, dt ? 1 - Math.exp(-dt * 16) : 1);
    const trunkEnd = this.trunkEnd;
    const trunkCtrl = heldTrunk ? rest : this.trunkCtrl;
    this.trunk.setCurve(this.trunkBase, trunkCtrl, trunkEnd);
    if (this.nettiRope) this.nettiRope.setCurve(this.trunkBase, trunkCtrl, trunkEnd, 0.36);
    this.trunkTip.position.copy(trunkEnd);
    this.trunkBangle.position.copy(trunkEnd);

    // tail
    const tailRest = tmpB.copy(this.tailRest);
    tailRest.y += Math.sin(p * 2.4) * 0.15;
    const oldTailX = this.tailAnchor.pos.x, oldTailY = this.tailAnchor.pos.y;
    g.localToWorld(this.tailAnchor.pos.copy(tailRest));
    if (dt > 0) this.tailAnchor.vel.set((this.tailAnchor.pos.x - oldTailX) / dt, (this.tailAnchor.pos.y - oldTailY) / dt, 0);
    const heldTail = this.held === 'tail';
    const tailTarget = heldTail ? g.worldToLocal(tmp.copy(this.hands)) : tailRest;
    this.tailEnd.lerp(tailTarget, dt ? 1 - Math.exp(-dt * 16) : 1);
    const tailEnd = this.tailEnd;
    this.tail.setCurve(this.tailBase, heldTail ? tailRest : this.tailCtrl, tailEnd);
    this.tailTip.position.copy(tailEnd);
    this.tailBangle.position.copy(tailEnd);

    // anjaamkaal
    if (this.anjaam) {
      const heldA = this.held === 'anjaam';
      const want = heldA || this.anjaamReady ? 1 : 0;
      this.anjaamExt += (want - this.anjaamExt) * Math.min(1, dt * 7);
      this.twang = Math.max(0, this.twang - dt);
      const e = this.anjaamExt;
      const b = this.anjaamBase;
      const wob = Math.sin(t * 38) * this.twang * 0.35;
      const dangle = tmpB.set(b.x - 0.1 + Math.sin(p * 2.2) * 0.2 * e + wob, b.y - 0.3 - 0.68 * e, 0.4 * e);
      const end = heldA ? g.worldToLocal(tmp.copy(this.hands)) : dangle;
      const ctrl = tmpC.set(b.x + 0.05 + wob * 0.5, b.y - 0.4 - 0.25 * e, 0.12 * e);
      this.anjaam.setCurve(b, ctrl, end);
      this.anjaamTip.position.copy(end);
    }
  }

  dispose() {
    this.ribbonMat.dispose();
    this.contact.geometry.dispose();
    this.contact.material.dispose();
    this.trunk.dispose();
    this.tail.dispose();
    this.nettiRope?.dispose();
    this.anjaam?.dispose();
  }
}
