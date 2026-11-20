// Encounter logic mixed into Game: pickups, monkeys, coconuts, projectiles, Kuttappan and fireworks.
import * as THREE from 'three';
import { ENCORE, chapterStart, CALLOUTS, TAUNTS, pick } from './story.js';
import { makeBanana, makeCoconut } from '../entities/props.js';
import { makeAuto } from '../entities/vehicles.js';

const FINALE = ENCORE - 1;
const AMBUSH_AT = chapterStart(1) + 63;
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
      const gained = this.heal(30);
      if (!gained) this.add(25);
      this.sfx('fanfare');
      this.pop(gained ? `CHAKKA +${gained} HP` : 'CHAKKA +25', 'gold');
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

  tickWorld(dt, beforeX, beforeY) {
    const sw = this.sw;
    const gx = sw.pos.x;
    const gy = sw.pos.y;
    this.recordDistance();
    const ch = this.route.at(this.distance);
    if (ch.key !== this.chapter.key) {
      this.changeChapter(ch);
      if (this.pendingCard) return;
    }
    this.tickChase(dt, ch);

    for (const it of this.level.items) {
      const p = it.mesh.position;
      if (it.taken || Math.abs(p.x - gx) > 1.7 || Math.abs(p.y - gy - 0.4) > 2) continue;
      it.taken = true;
      this.fx.sparkle(p);
      this.collect(it.type);
    }

    // banana-throwing cousins
    for (const m of this.level.monkeys) {
      m.mesh.getWorldPosition(v3);
      const dx = v3.x - gx;
      const inRange = dx > 3 && dx < 17;
      if (inRange) m.cooldown -= dt;
      m.mesh.userData.arm.rotation.z = inRange && m.cooldown < 0.36 ? -2 : Math.sin(this.t * 4) * 0.3;
      if (inRange && m.cooldown <= 0) {
        m.cooldown = rand(2.2, 3.4);
        this.sfx('toss');
        this.throwAt(v3.x, v3.y + 0.8);
      }
    }

    if (this.cfg.coconut > 0) {
      this.coconutT -= dt;
      if (this.coconutT <= 0) {
        this.coconutT = rand(1.4, 2.6);
        if (Math.random() < this.cfg.coconut) {
          const x = gx + Math.max(1, sw.vel.x * 0.85) + rand(-1, 3);
          this.coconutWarning = { x, remaining: 0.42 };
          this.pop('COCONUT ↓', 'warning', { x, y: 12 }, 0);
        }
      }
    }
    if (this.coconutWarning) {
      this.coconutWarning.remaining -= dt;
      if (this.coconutWarning.remaining <= 0) {
        this.spawnProjectile('coconut', this.coconutWarning.x, 17, 0, -2, 22);
        this.coconutWarning = null;
      }
    }

    this.projectiles = this.projectiles.filter((p) => {
      const rx = p.x - beforeX;
      const ry = p.y - (beforeY + 0.6);
      const dx = (p.vx * dt) - (gx - beforeX);
      const dy = (p.vy * dt - 0.5 * p.g * dt * dt) - (gy - beforeY);
      const segment = dx * dx + dy * dy;
      const closest = segment ? Math.max(0, Math.min(1, -(rx * dx + ry * dy) / segment)) : 0;
      const distance = Math.hypot(rx + dx * closest, ry + dy * closest);
      p.y += p.vy * dt - 0.5 * p.g * dt * dt;
      p.vy -= p.g * dt;
      p.x += p.vx * dt;
      p.life -= dt;
      p.mesh.position.set(p.x, p.y, 1.8);
      p.mesh.rotation.z += dt * 10;
      if (distance < 1.14) {
        this.bonk(p.type);
        p.life = 0;
      } else if (!p.awarded && !this.demo && !this.sling && !this.invuln && !this.rage && !this.dying) {
        if (distance < 1.85) p.close = true;
        if (p.close && Math.hypot(p.x - gx, p.y - (gy + 0.6)) > 2.6) {
          p.awarded = true;
          this.add(15);
          this.pop('CLOSE CALL +15', 'good');
          this.sfx('collect', 3);
        }
      }
      if (p.life <= 0 || p.y < -1) {
        this.stage.scene.remove(p.mesh);
        return false;
      }
      return true;
    });
    if (this.dying) return;

    this.tickKuttappan(dt, gx, beforeX, beforeY);
    if (this.pendingCard) return;

    if (this.cfg.night) {
      this.fireworkT -= dt;
      if (this.fireworkT <= 0) {
        this.fireworkT = rand(0.5, 1.2);
        this.fx.firework(new THREE.Vector3(gx + rand(-5, 35), rand(14, 26), rand(-30, -10)));
        if (Math.random() < 0.4) this.sfx('firework');
      }
    }
  },

  tickChase(dt, chapter) {
    if (this.demo) return;
    if (chapter.index === 2 && !this.vallamSeen && this.distance >= chapterStart(2) + 19) {
      this.vallamSeen = true;
      this.level.addBoat(this.sw.pos.x + 15, -1.3, true);
      this.hud.banner('VALLAMKALI', 'Land on the race boat for +45');
    }
    if (this.settings.music && !this.radioPlayed && this.distance >= this.startX + 125 && !this.pendingCard && !this.ambush?.shots) {
      this.radioPlayed = this.audio.playRadio();
    }
    if (this.settings.theri && this.rage <= 0 && !this.pendingCard && (this.quipT -= dt) <= 0) {
      this.quipT = rand(17, 31);
      this.audio.randomQuip();
    }
    if (!this.ambush && chapter.index === 1 && this.distance >= AMBUSH_AT) {
      const x = this.sw.pos.x;
      const rescue = this.level.addVehicle(makeAuto(true), x + 13, -1.6, 'AUTO SHORTCUT +60');
      rescue.ambush = true;
      this.ambush = { shots: 2, timer: 0.95 };
      this.hud.banner('BANANA AMBUSH', 'Swing high or drop onto the auto');
      this.sfx('horn');
    }
    const event = this.ambush;
    if (!event?.shots || chapter.index !== 1) return;
    event.timer -= dt;
    if (event.timer > 0) return;
    event.timer = 1.15;
    event.shots--;
    const x = this.sw.pos.x + 11;
    const y = Math.min(6.5, this.level.topAt(x) + 1.3);
    this.sfx('toss');
    this.throwAt(x, y, 2.7);
  },

  tickKuttappan(dt, gx, beforeX, beforeY) {
    const k = this.kutt;
    const lead = this.stage.viewHalfWidth() * 0.7 + 4;
    const ev = k.update(dt, this.t, this.sw.pos, lead, this.level, beforeX, beforeY);
    if (ev) this.onKuttappan(ev);
    if (!k.active) return;
    const dx = k.pos.x - gx;
    this.tauntT -= dt;
    if (this.tauntT <= 0 && dx > 2 && dx < lead + 4) {
      this.tauntT = rand(5, 9);
      this.pop(pick(TAUNTS), 'taunt', k.pos, 2.8);
      this.sfx('monkey');
      if (Math.random() < 0.42) this.replyT = 0.8;
    }
    if (this.replyT > 0) {
      this.replyT -= dt;
      if (this.replyT <= 0) this.shout(true);
    }
    if (this.cfg.kthrow > 0 && k.state === 'run') {
      this.kthrowT -= dt;
      if (this.kthrowT <= 0 && dx > 4 && dx < 18) {
        this.kthrowT = rand(2.4, 4.2) / this.cfg.kthrow;
        this.throwAt(k.pos.x, k.pos.y + 1);
      }
    }
  },

  onKuttappan(ev) {
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
    this.caughtKuttappan = ev.type === 'caught';
    if (ev.chapter !== FINALE || !this.caughtKuttappan) return;
    this.route.startEncore(this.distance);
    this.level.refreshAhead(this.distance);
    this.changeChapter(this.route.at(this.distance), true);
  },

  throwAt(x, y, ceiling = 15) {
    const sw = this.sw;
    const gravity = 7.5;
    const flight = THREE.MathUtils.clamp(Math.abs(x - sw.pos.x) / 17, 0.32, 0.8);
    const targetX = Math.min(x - 2, sw.pos.x + sw.vel.x * flight * 0.38);
    const targetY = THREE.MathUtils.clamp(sw.pos.y + 0.6 + sw.vel.y * flight * 0.28, 1.8, ceiling);
    const vx = Math.max(-17, (targetX - x) / flight);
    const vy = THREE.MathUtils.clamp((targetY - y) / flight + 0.5 * gravity * flight, -9, 12);
    this.spawnProjectile('banana', x, y, vx, vy, gravity);
  },

  spawnProjectile(type, x, y, vx, vy, g) {
    const mesh = type === 'banana' ? makeBanana() : makeCoconut();
    mesh.position.set(x, y, 1.8);
    this.stage.scene.add(mesh);
    this.projectiles.push({ type, mesh, x, y, vx, vy, g, life: 3 });
  },
};
