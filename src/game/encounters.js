// Encounter logic mixed into Game: pickups, monkeys, coconuts, projectiles, Kuttappan and fireworks.
import * as THREE from 'three';
import { chapterAt, progress, CALLOUTS, TAUNTS, pick } from './story.js';
import { makeBanana, makeCoconut } from '../entities/props.js';

const FINALE = 4;
const rand = (a, b) => a + Math.random() * (b - a);
const v3 = new THREE.Vector3();

export const Encounters = {
  collect(type) {
    const teaCombo = this.perks.collect(type, this.t);
    if (type === 'fritter') {
      this.add(3 * this.combo);
      this.sfx('collect', this.combo);
    } else if (type === 'chaya') {
      this.shield = true;
      if (!teaCombo) {
        this.sfx('perfect');
        this.pop('CHAYA POWER! ☕', 'gold');
      }
    } else if (type === 'chakka') {
      this.lives = Math.min(5, this.lives + 1);
      this.sfx('fanfare');
      this.pop('+1 CHAKKA!', 'gold');
    } else if (type === 'mulaku') {
      this.sfx('perfect');
      this.pop('KANTHARI! 🌶️', 'bad');
      this.addTheri(0.5);
    } else if (type === 'porotta') {
      this.magnet = 9;
      this.sfx('perfect');
      this.pop('POROTTA MAGNET!', 'gold');
    }
    if (teaCombo) {
      this.add(75);
      this.teaSlow = 0.65;
      this.sfx('teaCombo');
      this.fx.marigolds?.(new THREE.Vector3(this.sw.pos.x, this.sw.pos.y + 1, 0));
    }
  },

  tickWorld(dt) {
    const sw = this.sw;
    const gx = sw.pos.x;
    const gy = sw.pos.y;
    if (gx > this.distance) {
      this.distPts += (gx - this.distance) * 2 * (this.rage > 0 ? 2 : 1);
      this.distance = gx;
    }
    const ch = chapterAt(this.distance);
    if (ch.cfg.name !== this.cfgName) this.applyBiome(ch);

    for (const it of this.level.items) {
      const p = it.mesh.position;
      if (it.taken || Math.abs(p.x - gx) > 1.7 || Math.abs(p.y - gy - 0.4) > 2) continue;
      it.taken = true;
      this.fx.sparkle(p);
      this.collect(it.type);
    }

    // banana-throwing cousins
    for (const m of this.level.monkeys) {
      m.cooldown -= dt;
      m.mesh.getWorldPosition(v3);
      const dx = v3.x - gx;
      m.mesh.userData.arm.rotation.z = m.cooldown < 0.3 ? -2 : Math.sin(this.t * 4) * 0.3;
      if (m.cooldown <= 0 && dx > 3 && dx < 17) {
        m.cooldown = rand(2.2, 3.4);
        this.throwAt(v3.x, v3.y + 0.8);
      }
    }

    if (this.cfg.coconut > 0) {
      this.coconutT -= dt;
      if (this.coconutT <= 0) {
        this.coconutT = rand(1.4, 2.6);
        if (Math.random() < this.cfg.coconut) this.spawnProjectile('coconut', gx + sw.vel.x * 1.1 + rand(-1, 3), 17, 0, -2, 22);
      }
    }

    this.projectiles = this.projectiles.filter((p) => {
      p.vy -= p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.mesh.position.set(p.x, p.y, 1.8);
      p.mesh.rotation.z += dt * 10;
      if (Math.hypot(p.x - gx, p.y - (gy + 0.6)) < 1.2) {
        this.bonk();
        p.life = 0;
      }
      if (p.life <= 0 || p.y < -1) {
        this.stage.scene.remove(p.mesh);
        return false;
      }
      return true;
    });

    this.tickKuttappan(dt, gx);

    if (this.cfg.night) {
      this.fireworkT -= dt;
      if (this.fireworkT <= 0) {
        this.fireworkT = rand(0.5, 1.2);
        this.fx.firework(new THREE.Vector3(gx + rand(-5, 35), rand(14, 26), rand(-30, -10)));
        if (Math.random() < 0.4) this.sfx('firework');
      }
    }
  },

  tickKuttappan(dt, gx) {
    const k = this.kutt;
    const lead = this.stage.viewHalfWidth() * 0.7 + 4;
    const ev = k.update(dt, this.t, this.sw.pos, lead, this.level);
    if (ev) this.onKuttappan(ev, lead);
    if (!k.active) return;
    const dx = k.pos.x - gx;
    this.tauntT -= dt;
    if (this.tauntT <= 0 && dx > 2 && dx < lead + 4) {
      this.tauntT = rand(5, 9);
      this.pop(pick(TAUNTS), 'taunt', k.pos, 2.8);
      this.sfx('monkey');
      if (Math.random() < 0.5) this.replyT = 0.8;
    }
    if (this.replyT > 0) {
      this.replyT -= dt;
      if (this.replyT <= 0) this.shout();
    }
    if (this.cfg.kthrow > 0 && k.state === 'run') {
      this.kthrowT -= dt;
      if (this.kthrowT <= 0 && dx > 4 && dx < 18) {
        this.kthrowT = rand(2.4, 4.2) / this.cfg.kthrow;
        this.throwAt(k.pos.x, k.pos.y + 1);
      }
    }
  },

  onKuttappan(ev, lead) {
    const at = this.kutt.pos.clone();
    if (ev.type === 'dodged') {
      this.pop('He dodged! After him!', 'bad');
      return;
    }
    if (ev.type === 'escaped') {
      this.pop('Kuttappan escaped!', 'bad');
      this.shout();
    } else {
      this.add(ev.type === 'caught' && ev.chapter === FINALE ? 500 : 150);
      this.sfx('fanfare');
      this.sfx('bonk');
      this.fx.confetti(at);
      this.pop(ev.type === 'hit' ? `BONK ${ev.hits}/${ev.need}!` : pick(CALLOUTS.boss), 'perfect', at, 2);
      this.slowmo = 0.4;
      if (ev.type === 'hit') return;
    }
    const victory = ev.chapter === FINALE && ev.type === 'caught';
    if (victory) {
      progress.victory = true;
      progress.victoryX = this.distance;
    }
    this.kutt.reset(this.sw.pos.x + lead + 12, victory ? FINALE + 1 : Math.min(ev.chapter + 1, FINALE));
    if (!this.demo) this.pendingCard = { chapter: ev.chapter, caught: ev.type === 'caught', victory };
  },

  throwAt(x, y) {
    const sw = this.sw;
    const lead = 0.6;
    const tx = sw.pos.x + sw.vel.x * lead - x;
    const ty = sw.pos.y + sw.vel.y * lead - y;
    const d = Math.hypot(tx, ty) || 1;
    this.spawnProjectile('banana', x, y, (tx / d) * 13, (ty / d) * 13, 0);
  },

  spawnProjectile(type, x, y, vx, vy, g) {
    const mesh = type === 'banana' ? makeBanana() : makeCoconut();
    mesh.position.set(x, y, 1.8);
    this.stage.scene.add(mesh);
    this.projectiles.push({ type, mesh, x, y, vx, vy, g, life: 3 });
  },
};
