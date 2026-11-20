// Kurangan Kuttappan: the banana bandit. Runs ahead across the elephants' backs with the
// Golden Nettipattam, then perches on a tusker's head near the end of each chapter.
import * as THREE from 'three';
import { makeMonkey } from '../entities/props.js';
import { CHAPTERS } from './story.js';

const v = new THREE.Vector3();
const FINALE = CHAPTERS.length - 1;

export class Kuttappan {
  constructor(scene) {
    this.mesh = makeMonkey(true);
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.state = 'gone';
    this.chapter = 0;
  }

  get active() { return this.state !== 'gone'; }

  reset(x, chapter) {
    if (chapter > FINALE) {
      this.state = 'gone';
      this.mesh.visible = false;
      return;
    }
    this.state = 'run';
    this.chapter = chapter;
    this.hits = 0;
    this.need = chapter === FINALE ? 3 : 1;
    this.firstPerch = CHAPTERS[chapter].end - (chapter === FINALE ? 130 : 35);
    this.sitX = this.firstPerch;
    this.x = x;
    this.baseY = 4;
    this.el = null;
    this.mesh.visible = true;
    this.pos.set(x, 5, 0.8);
  }

  // Returns null, or one of: {type:'hit'|'caught'|'escaped'|'dodged'}
  update(dt, t, gedi, lead, level, beforeX = gedi.x, beforeY = gedi.y) {
    if (this.state === 'gone') return null;

    if (this.state === 'run') {
      const target = Math.min(gedi.x + lead, this.sitX + 6);
      if (target > this.x) this.x += (target - this.x) * Math.min(1, dt * 2.5);
      // he leaps from back to back, never touching the ground
      this.baseY += (Math.max(level.topAt(this.x), 3.4) - this.baseY) * Math.min(1, dt * 10);
      this.pos.set(this.x, this.baseY + Math.abs(Math.sin(t * 8)) * 1.1, 0.8);
      this.mesh.rotation.set(0, -0.7, Math.sin(t * 8) * 0.15);
      if (this.x >= this.sitX) {
        const el = level.perchFor(this.x);
        if (el) {
          this.el = el;
          this.state = 'sit';
        }
      }
      return null;
    }

    // sitting on a tusker's head, taunting
    const el = this.el;
    if (!el.group.parent) {
      this.state = 'run';
      return null;
    }
    el.group.localToWorld(v.set(-2.3, 4.5, 0.4));
    this.x = v.x;
    this.pos.set(v.x, v.y + Math.abs(Math.sin(t * 5)) * 0.35, v.z + 0.4);
    this.mesh.rotation.set(0, Math.sin(t * 3) * 0.5, 0);

    const dx = gedi.x - beforeX, dy = gedi.y - beforeY;
    const rx = beforeX - this.pos.x, ry = beforeY - (this.pos.y + 0.6);
    const lengthSq = dx * dx + dy * dy;
    const closest = lengthSq ? THREE.MathUtils.clamp(-(rx * dx + ry * dy) / lengthSq, 0, 1) : 0;
    if (Math.hypot(rx + dx * closest, ry + dy * closest) < 2.8) {
      this.hits++;
      if (this.hits >= this.need) {
        this.state = 'gone';
        this.mesh.visible = false;
        return { type: 'caught', chapter: this.chapter };
      }
      this.state = 'run';
      this.sitX = this.x + 40;
      this.x += 5;
      return { type: 'hit', hits: this.hits, need: this.need };
    }
    if (gedi.x > this.pos.x + 10) {
      if (this.need === 1) {
        this.state = 'gone';
        this.mesh.visible = false;
        return { type: 'escaped', chapter: this.chapter };
      }
      this.state = 'run';
      this.sitX = gedi.x + 26;
      this.x = gedi.x + 4;
      return { type: 'dodged' };
    }
    return null;
  }
}
