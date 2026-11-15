// Aiming helpers: a ring on the anchor Gedi would grab, and a dotted arc of where a release would send him.
import * as THREE from 'three';
import { TUNING, perfectRelease } from './swing.js';

const DOTS = 12;
const GOLD = new THREE.Color('#ffd23f');
const WHITE = new THREE.Color('#ffffff');

export class Aim {
  constructor(scene) {
    this.ringMat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, depthTest: false });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 8, 28), this.ringMat);
    this.ring.renderOrder = 10;
    this.ring.visible = false;
    scene.add(this.ring);

    this.dotMat = new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.9, depthTest: false });
    const geo = new THREE.SphereGeometry(0.12, 8, 6);
    this.dots = [];
    this.pts = [];
    for (let i = 0; i < DOTS; i++) {
      const d = new THREE.Mesh(geo, this.dotMat);
      d.renderOrder = 10;
      d.visible = false;
      d.scale.setScalar(1 - i * 0.055);
      scene.add(d);
      this.dots.push(d);
      this.pts.push({ x: 0, y: 0 });
    }
  }

  hide() {
    this.ring.visible = false;
    for (const d of this.dots) d.visible = false;
  }

  update(game) {
    const { sw, level } = game;
    if (!game.running || game.demo || game.sling || game.fallT > 0 || game.dying > 0) {
      this.hide();
      return;
    }
    if (game.current) {
      this.ring.visible = false;
      sw.predict(this.pts, 0.085, !game.demo && game.audio.beatOffset() < 0.11 && sw.vel.x > 0, game.perks.teaCharge ? 1.08 : 1);
      this.dotMat.color.copy(perfectRelease(sw.vel) ? GOLD : WHITE);
      this.dots.forEach((d, i) => {
        const p = this.pts[i];
        d.visible = p.y > 0.4;
        d.position.set(p.x, p.y, 1.8);
      });
      return;
    }
    for (const d of this.dots) d.visible = false;
    const exclude = game.cooldown > 0 ? game.lastReleased : null;
    const near = level.findAnchor(sw.pos.x, sw.pos.y, TUNING.grabRadius, exclude);
    const target = near || level.findAnchor(sw.pos.x, sw.pos.y, 30, exclude);
    this.target = target;
    if (!target) {
      this.ring.visible = false;
      return;
    }
    this.ring.visible = true;
    this.ring.position.set(target.pos.x, target.pos.y, target.pos.z + 0.6);
    this.ringMat.color.copy(near ? GOLD : WHITE);
    this.ringMat.opacity = near ? 1 : 0.4;
    this.ring.scale.setScalar(near ? 1.15 + Math.sin(game.t * 14) * 0.18 : 0.9);
  }
}
