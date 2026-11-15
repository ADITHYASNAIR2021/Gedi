// Gedi: a flat photo cutout head on a tailored, articulated 3D body.
import * as THREE from 'three';
import { contactShadow } from '../world/materials.js';
import { spring } from '../core/motion.js';

export const GEDI_SCALE = 1.45;

function teeTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e9dfc6';
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#1d1d1d';
  g.font = 'bold 74px "Baloo Chettan 2", Arial Black, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('GEDI', 256, 120);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

function clothTexture(denim = false) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = denim ? '#8c9397' : '#b8b5ab'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 2) {
    ctx.strokeStyle = i % 4 ? '#c8c5bd' : '#9b9d98'; ctx.lineWidth = .5;
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(denim ? i + 128 : i, 128); ctx.stroke();
  }
  const map = new THREE.CanvasTexture(c); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(3, 5);
  return map;
}

export class Gedi {
  constructor() {
    const skin = std('#a86f4b');
    const jeans = std('#354b5d', { bumpMap: clothTexture(true), bumpScale: .012 });
    const shoe = std('#d9d3c3', { roughness: .7 });
    const rubber = std('#9c9d91', { roughness: .94 });
    const sleeve = std('#e9dfc6', { bumpMap: clothTexture(), bumpScale: .008 });
    const stitch = std('#a99b76', { roughness: 1 });
    const watch = std('#111111', { metalness: 0.6, roughness: 0.3 });
    const silver = std('#d9d9d9', { metalness: 0.9, roughness: 0.2 });

    this.group = new THREE.Group();
    this.group.scale.setScalar(GEDI_SCALE);
    this.body = new THREE.Group();
    this.group.add(this.body);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(.29, .255, .67, 24), sleeve);
    torso.scale.z = .68;
    torso.castShadow = true;
    this.body.add(torso);
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), sleeve);
    shoulders.position.y = .23; shoulders.scale.set(.33, .14, .2); shoulders.castShadow = true; this.body.add(shoulders);
    const print = new THREE.Mesh(new THREE.PlaneGeometry(.43, .25), new THREE.MeshStandardMaterial({ map: teeTexture(), roughness: .95 }));
    print.position.set(0, .035, .205); this.body.add(print);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.095, .11, .15, 12), skin);
    neck.position.y = .39; this.body.add(neck);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(.117, .018, 6, 20), sleeve);
    collar.rotation.x = Math.PI / 2; collar.position.y = .32; this.body.add(collar);
    const hem = new THREE.Mesh(new THREE.TorusGeometry(.257, .009, 5, 24), stitch);
    hem.rotation.x = Math.PI / 2; hem.scale.y = .68; hem.position.y = -.32; this.body.add(hem);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(.252, .25, .065, 20), std('#473f32'));
    belt.position.y = -.33; belt.scale.z = .67; this.body.add(belt);
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 6, 20), silver);
    chain.position.set(0, 0.3, 0.06);
    chain.rotation.x = Math.PI / 2.4;
    this.body.add(chain);

    this.arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(0.33 * side, 0.22, 0);
      const sl = new THREE.Mesh(new THREE.CylinderGeometry(.105, .115, .23, 12), sleeve);
      sl.position.y = .09;
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(.075, .14, 4, 10), skin);
      upper.position.y = .25;
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(.076, 10, 8), skin); elbow.position.y = .37;
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(.067, .076, .23, 12), skin);
      fore.position.set(0, .49, .015); fore.rotation.x = .08;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 8), skin);
      hand.position.set(0, .66, .026); hand.scale.set(.8, 1.2, .65);
      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(.025, .06, 3, 6), skin);
      thumb.position.set(.065 * side, .64, .05); thumb.rotation.z = -.35 * side;
      arm.add(sl, upper, elbow, fore, hand, thumb);
      arm.traverse(part => { if (part.isMesh) part.castShadow = true; });
      if (side === -1) {
        const w = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.03, 6, 12), watch);
        w.position.y = 0.55;
        w.rotation.x = Math.PI / 2;
        arm.add(w);
      }
      this.body.add(arm);
      this.arms.push(arm);
    }

    this.legs = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(0.13 * side, -0.28, 0);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(.118, .14, .34, 14), jeans);
      l.position.y = -.19;
      l.castShadow = true;
      const knee = new THREE.Mesh(new THREE.SphereGeometry(.114, 12, 8), jeans); knee.position.set(0, -.37, .018);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(.105, .085, .27, 14), jeans); shin.position.set(0, -.5, .01);
      const seam = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .58, 5), stitch);
      seam.position.set(.109 * side, -.32, .04);
      const s = new THREE.Mesh(new THREE.CapsuleGeometry(.095, .14, 4, 12), shoe);
      s.rotation.x = Math.PI / 2; s.position.set(0, -.68, .08); s.scale.set(1.05, 1, .7); s.castShadow = true;
      const sole = new THREE.Mesh(new THREE.BoxGeometry(.19, .025, .33), rubber); sole.position.set(0, -.745, .07);
      leg.add(l, knee, shin, seam, s, sole);
      this.body.add(leg);
      this.legs.push(leg);
    }

    this.head = new THREE.Group();
    this.head.position.y = 0.78;
    this.head.scale.setScalar(1);
    const faceTex = new THREE.TextureLoader().load('/assets/gedi-face.png');
    faceTex.colorSpace = THREE.SRGBColorSpace;
    faceTex.anisotropy = 4;
    this.faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, alphaTest: .15, color: '#ffffff', side: THREE.DoubleSide, toneMapped: false });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 1.04), this.faceMat);
    face.position.z = .29;
    this.head.add(face);
    this.body.add(this.head);

    this.stars = [];
    const starMat = new THREE.MeshBasicMaterial({ color: '#ffd400' });
    for (let i = 0; i < 3; i++) {
      const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), starMat);
      st.visible = false;
      this.head.add(st);
      this.stars.push(st);
    }

    this.bubble = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 20, 14),
      new THREE.MeshBasicMaterial({ color: '#ffcf4d', transparent: true, opacity: 0.18, depthWrite: false }),
    );
    this.bubble.position.y = 0.3;
    this.bubble.visible = false;
    this.group.add(this.bubble);

    // theri-mode aura
    this.aura = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 20, 14),
      new THREE.MeshBasicMaterial({ color: '#ff3b1f', transparent: true, opacity: 0.28, depthWrite: false }),
    );
    this.aura.position.y = 0.3;
    this.aura.visible = false;
    this.group.add(this.aura);

    this.roll = 0;
    this.rollVelocity = 0;
    this.armAngles = [0, 0]; this.armVelocities = [0, 0];
    this.impact = 0;
    this.squash = 0;
    this.hands = new THREE.Vector3();
    this.contact = contactShadow(2.5, 1.7);
  }

  grabbed() { this.squash = 1; }
  landed() { this.impact = 1; }
  resetMotion() { this.rollVelocity = 0; this.impact = 0; this.squash = 0; }

  setRage(on) {
    this.aura.visible = on;
    this.faceMat.color.set(on ? '#ff8a7a' : '#f2f2f2');
  }

  // state: { pos, vel, anchor (Vector3|null), stunned, shield, invuln, t }
  update(dt, s) {
    this.contact.position.set(s.pos.x, 0.055, 1.8);
    this.contact.material.opacity = Math.max(0.12, 0.7 - s.pos.y * 0.045);
    this.contact.scale.setScalar(1 + s.pos.y * 0.03);
    this.group.position.set(s.pos.x, s.pos.y, 1.8);
    const t = s.t;
    let targetRoll;
    if (s.anchor) {
      const dx = s.anchor.x - s.pos.x;
      const dy = s.anchor.y - s.pos.y;
      targetRoll = Math.atan2(-dx, dy);
      this.arms[0].rotation.z = 0.12;
      this.arms[1].rotation.z = -0.12;
      const kick = Math.sin(t * 7) * 0.25 + THREE.MathUtils.clamp(s.vel.x * 0.02, -0.3, 0.3);
      this.legs[0].rotation.z = kick;
      this.legs[1].rotation.z = -kick * 0.6;
    } else {
      targetRoll = THREE.MathUtils.clamp(-s.vel.x * 0.025 + s.vel.y * 0.01, -0.7, 0.7);
      const flail = Math.sin(t * 5) * 0.12;
      this.arms[0].rotation.z = 1.5 + flail;
      this.arms[1].rotation.z = -1.5 + flail;
      this.legs[0].rotation.z = .25 + Math.sin(t * 4) * .12;
      this.legs[1].rotation.z = -.12 - Math.sin(t * 4) * .1;
    }
    let d = targetRoll - this.roll;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    [this.roll, this.rollVelocity] = spring(this.roll, this.rollVelocity, this.roll + d, 14, dt);
    this.body.rotation.z = this.roll;
    this.arms.forEach((arm, i) => {
      [this.armAngles[i], this.armVelocities[i]] = spring(this.armAngles[i], this.armVelocities[i], arm.rotation.z, 18, dt);
      arm.rotation.z = this.armAngles[i];
    });

    this.squash = Math.max(0, this.squash - dt * 4);
    this.impact = Math.max(0, this.impact - dt * 5);
    const sq = Math.sin(this.squash * Math.PI) * 0.06;
    const compression = Math.sin(this.impact * Math.PI) * .14;
    this.body.scale.set(1 - sq * .25 + compression * .2, 1 + sq - compression, 1);
    this.head.rotation.z = -this.rollVelocity * .005;
    this.head.scale.setScalar(1);

    this.stars.forEach((st, i) => {
      st.visible = s.stunned > 0;
      const a = t * 6 + (i * Math.PI * 2) / 3;
      st.position.set(Math.cos(a) * 0.55, 0.45, Math.sin(a) * 0.55);
      st.rotation.y = t * 8;
    });
    this.bubble.visible = s.shield;
    this.bubble.scale.setScalar(1 + Math.sin(t * 4) * 0.04);
    if (this.aura.visible) this.aura.scale.setScalar(1 + Math.sin(t * 18) * 0.1);
    this.group.visible = true;
    this.bubble.visible = s.shield || s.invuln > 0;

    // hands sit at the arm tip, pointing along the body's up axis
    const up = (0.22 + 0.66) * GEDI_SCALE;
    this.hands.set(s.pos.x - Math.sin(this.roll) * up, s.pos.y + Math.cos(this.roll) * up, 1.8);
    return this.hands;
  }
}
