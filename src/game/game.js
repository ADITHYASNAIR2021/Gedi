// Gameplay loop: input, swing physics, anjaamkaal rescues, theri rage, encounters and scoring.
import * as THREE from 'three';
import { Swinger, TUNING, perfectRelease, launchVelocity } from './swing.js';
import { Kuttappan } from './kuttappan.js';
import { Aim } from './aim.js';
import { Encounters } from './encounters.js';
import { chapterAt, chapterStart, progress, CALLOUTS, THERI, CLEAN, pick } from './story.js';
import { GEDI_SCALE } from '../entities/gedi.js';
import { RunPerks } from './perks.js';

const STEP = 1 / 120;
const FEET = 1.15 * GEDI_SCALE;
const RAGE_TIME = 8;
const MAX_HEALTH = 100;
const FALL_DAMAGE = 35;
const HITS = {
  banana: { damage: 15, carry: 0.82, drop: 3, stun: 0.28, shake: 0.13, label: 'BANANA BONK!' },
  coconut: { damage: 25, carry: 0.63, drop: 5, stun: 0.48, shake: 0.24, label: 'COCONUT BONK!' },
};
const rand = (a, b) => a + Math.random() * (b - a);
const v3 = new THREE.Vector3();

export class Game {
  // deps: { stage, env, level, fx, audio, hud, gedi, settings, touch }
  constructor(deps) {
    Object.assign(this, deps);
    this.sw = new Swinger();
    this.perks = new RunPerks();
    this.kutt = new Kuttappan(this.stage.scene);
    this.aim = new Aim(this.stage.scene);
    this.projectiles = [];
    this.handlers = {};
    this.running = false;
    this.paused = false;
    this.holding = false;
    this.demo = false;
  }

  on(name, fn) { this.handlers[name] = fn; }
  emit(name, ...args) { this.handlers[name]?.(...args); }

  // demo: self-playing attract mode behind the menu (no sound, no popups, no game over)
  start({ chapter = 0, demo = false, teach = false } = {}) {
    this.projectiles.forEach((p) => this.stage.scene.remove(p.mesh));
    this.projectiles = [];
    progress.victory = false;
    progress.victoryX = 0;
    this.perks.reset();
    this.audio.setFestival?.(0);
    this.gedi.resetMotion?.();
    this.env.reset();
    const startX = chapterStart(chapter);
    const first = this.level.reset(startX);
    Object.assign(this, {
      demo, teach, startX, t: 0, time: 0, acc: 0, distance: startX, distPts: 0, bonus: 0, health: MAX_HEALTH, combo: 1,
      shield: false, magnet: 0, invuln: 0, stunned: 0, cooldown: 0, lastReleased: null, current: null, style: null, bounceSpring: null, teaSlow: 0,
      sling: null, sneezeT: 0, fallT: 0, dying: 0, slowmo: 0, bounceCooldown: 0, cfgName: '', fireworkT: 1, coconutT: 2, tauntT: 4,
      kthrowT: 3, replyT: 0, theriPopT: 0, theri: 0, rage: 0, dustT: 0, pendingCard: null, holding: true,
      grabbed: new Set(), tut: { grabs: 0, releases: 0 },
      radioPlayed: false, ambush: null, coconutWarning: null, vallamSeen: false, quipT: rand(14, 25),
      stats: { elephants: 0, perfects: 0, anjaam: 0, theri: 0, names: [] },
    });
    this.applyBiome(chapterAt(startX), true);
    this.hangFrom(first);
    this.kutt.reset(startX + 12, chapter);
    this.gedi.setRage(false);
    this.hud.setRage(false);
    this.hud.hint(null);
    this.stage.follow(this.sw.pos, this.sw.vel, 1, true);
    this.running = true;
    this.paused = false;
    if (!demo) this.audio.startMusic();
    this.hud.update(this.snapshot());
  }

  hangFrom(el) {
    const a = el.trunkAnchor.pos;
    this.sw.reset(a.x + 0.4, a.y - 2.6);
    this.attach(el.trunkAnchor, true);
  }

  setHold(on) { this.holding = on; }

  get score() { return Math.floor(this.distPts) + this.bonus; }

  snapshot() {
    const ch = chapterAt(this.distance);
    const start = chapterStart(ch.index);
    const progressK = ch.encore ? 1 : (this.distance - start) / (ch.cfg.end - start);
    return {
      score: this.score, distance: Math.floor(this.distance - this.startX), health: this.health, combo: this.combo,
      shield: this.shield, magnet: this.magnet > 0, chapterName: ch.cfg.name, progress: progressK,
      beat: this.audio.beatPhase(), theri: this.theri, rage: this.rage > 0,
      radio: this.audio.radioActive,
      soundtrack: this.audio.chapterMusicTitle,
      theriMix: this.audio.theriMode,
      attached: !!this.current, perfect: !!this.current && perfectRelease(this.sw.vel),
      rhythm: this.perks.rhythm, festival: this.perks.level, teaCharge: this.perks.teaCharge,
      teaCombo: this.t < this.perks.teaUntil,
      personality: this.current?.el.personality || this.aim.target?.el.personality || null,
    };
  }

  // ---------- feedback helpers (silent in demo mode) ----------
  sfx(name, arg) { if (!this.demo) this.audio.play(name, arg); }

  pop(text, cls = '', pos = this.sw.pos, dy = 2.4) {
    if (this.demo || !text) return;
    v3.set(pos.x, pos.y + dy, 1.8).project(this.stage.camera);
    this.hud.popup(text, (v3.x * 0.5 + 0.5) * 100, (-v3.y * 0.5 + 0.5) * 100, cls);
  }

  bubble(text) { this.pop(text, 'bubble', this.sw.pos, 3.6); }

  // Gedi lets one fly (theri, or the family-friendly version).
  shout(recorded = false) {
    const spicyClip = this.settings.theri && recorded;
    const word = spicyClip ? 'MYRE!' : pick(this.settings.theri ? THERI : CLEAN);
    this.bubble(word);
    this.stats.theri++;
    if (!this.demo && (!spicyClip || !this.audio.sample?.('myre'))) {
      this.audio.say(word.toLowerCase().replace(/!/g, ''));
    }
  }

  add(points) { this.bonus += points * (this.rage > 0 ? 2 : 1); }

  applyBiome(ch, instant = false) {
    this.cfgName = ch.cfg.name;
    this.cfg = ch.cfg;
    this.stage.setBiome(ch.cfg, instant);
    this.env.setBiome(ch.cfg);
    this.audio.setTempo(ch.cfg.bpm);
    this.audio.setChapterMusic(ch.cfg.music);
    this.audio.setAmbience?.(ch.cfg);
    if (!instant && !this.demo) this.hud.banner(ch.cfg.name, ch.cfg.place);
  }

  // ---------- grabbing & releasing ----------
  attach(anchor, silent = false) {
    this.sw.attach(anchor);
    this.bounceSpring = null;
    this.current = anchor;
    anchor.el.hold(anchor.kind);
    this.gedi.grabbed();
    const style = this.style;
    this.style = null;
    this.sneezeT = anchor.el.variant === 'sneezy' && anchor.kind === 'trunk' && !anchor.el.sneezed ? 0.9 : 0;
    if (silent) return;
    this.tut.grabs++;
    this.sfx('grab');
    const onward = style && anchor.pos.x > style.fromX + 1;
    const milestone = this.perks.land(!!onward && style.beat);
    if (onward) this.award(style);
    this.audio.setFestival?.(this.perks.level);
    if (milestone && !this.demo) {
      this.sfx('festival', this.perks.level);
      this.fx.marigolds?.(new THREE.Vector3(this.sw.pos.x + 2, this.sw.pos.y + 3, -1));
      if (this.perks.level >= 2) this.fx.firework(new THREE.Vector3(this.sw.pos.x + 10, 15, -25));
    }
    if (this.grabbed.has(anchor.el)) return;
    this.grabbed.add(anchor.el);
    if (!this.demo && anchor.el.aana) this.emit('aana', anchor.el.aana);
    this.stats.elephants++;
    if (this.stats.names.length < 40) this.stats.names.push(anchor.el.name);
    if (Math.random() < 0.3) this.sfx('trumpet', anchor.el.scale < 1 ? 1.5 : 1);
    if (anchor.el.variant === 'baby') {
      this.add(10 * this.combo);
      this.pop('KUTTIYAANA ×2!', 'gold');
    } else if (this.stats.elephants % 4 === 1) {
      this.pop(`🐘 ${anchor.el.name}`, 'name', anchor.pos, 1.4);
    }
  }

  detach() {
    const anchor = this.current;
    if (!anchor) return;
    anchor.el.release();
    this.sw.detach();
    this.current = null;
    this.lastReleased = anchor;
    this.cooldown = 0.7;
  }

  release() {
    const from = this.current;
    this.detach();
    this.tut.releases++;
    const v = this.sw.vel;
    this.sfx('whoosh', Math.min(1.5, Math.hypot(v.x, v.y) / 12));
    const perfect = perfectRelease(v);
    const beat = !this.demo && this.audio.beatOffset() < 0.11 && v.x > 0;
    if (beat) {
      this.sfx('beat');
      this.hud.drumHit();
    }
    // style points only pay out if the next grab is further ahead (no farming one trunk)
    this.style = { perfect, beat, fromX: from.pos.x };
    Object.assign(v, launchVelocity(v, beat, this.perks.launch()));
  }

  award({ perfect, beat }) {
    if (perfect) {
      this.combo = Math.min(5, this.combo + 1);
      this.add(5 * this.combo);
      this.stats.perfects++;
      this.sfx('perfect');
      const word = pick(CALLOUTS.perfect);
      this.pop(word, 'perfect');
      if (!this.demo) this.audio.say(word.toLowerCase().replace('!', ''));
      if (this.combo >= 3 && Math.random() < 0.4) this.pop(`${pick(CALLOUTS.combo)} ×${this.combo}`, 'combo');
    }
    if (beat) {
      this.add(3 * this.combo);
      this.pop(pick(CALLOUTS.beat), 'beat');
    }
  }

  // ---------- anjaamkaal: the fifth leg catches a falling Gedi and slings him back up ----------
  startSling(el) {
    const base = el.anjaamWorld(new THREE.Vector3());
    this.sling = { el, t: 0, dur: 0.6, fromX: this.sw.pos.x, fromY: this.sw.pos.y, base };
    el.hold('anjaam');
    this.sw.vel.x = 0;
    this.sw.vel.y = 0;
    this.style = null;
    this.stats.anjaam++;
    this.add(30);
    this.sfx('twang');
    this.pop(pick(CALLOUTS.anjaam), 'anjaam');
    this.stage.shake = 0.1;
  }

  tickSling(dt) {
    const s = this.sling;
    s.t += dt;
    const k = Math.min(1, s.t / s.dur);
    const e = k * k * (3 - 2 * k);
    const u = 1 - e;
    const cx = s.base.x - 1.4;
    const cy = Math.max(FEET + 0.1, s.fromY - 0.6);
    const tx = s.base.x + 2.2;
    const ty = s.base.y + 2.6;
    this.sw.pos.x = u * u * s.fromX + 2 * u * e * cx + e * e * tx;
    this.sw.pos.y = Math.max(FEET + 0.05, u * u * s.fromY + 2 * u * e * cy + e * e * ty);
    if (k < 1) return;
    s.el.useAnjaam();
    this.sling = null;
    this.sw.vel.x = 10;
    this.sw.vel.y = 15.5;
    this.cooldown = 0;
    this.invuln = Math.max(this.invuln, 0.5);
    this.sfx('bounce');
    this.sfx('trumpet', 1.2);
    this.bubble(pick(CALLOUTS.anjaamSaved));
    this.fx.confetti(new THREE.Vector3(this.sw.pos.x, this.sw.pos.y, 1.8));
  }

  // ---------- theri meter ----------
  addTheri(amount) {
    if (this.rage > 0 || this.demo) return;
    this.theri = Math.min(1, this.theri + amount);
    if (this.theri < 1) return;
    this.rage = RAGE_TIME;
    this.stunned = 0;
    this.gedi.setRage(true);
    this.hud.setRage(true);
    this.audio.setTheriMode(true);
    this.sfx('rage');
    this.pop(this.settings.theri ? 'THERI MODE!!' : 'RAGE MODE!!', 'rage', this.sw.pos, 4.4);
    this.stage.shake = 0.8;
  }

  tickRage(dt) {
    if (this.rage <= 0) return;
    this.rage -= dt;
    this.theri = Math.max(0, this.rage / RAGE_TIME);
    this.theriPopT -= dt;
    if (this.theriPopT <= 0) {
      this.theriPopT = 0.55;
      const word = pick(this.settings.theri ? THERI : CLEAN);
      this.pop(word, 'theri', { x: this.sw.pos.x + rand(-3, 3), y: this.sw.pos.y + rand(-1, 2) }, 2);
    }
    if (this.rage <= 0) {
      this.theri = 0;
      this.gedi.setRage(false);
      this.hud.setRage(false);
      this.audio.setTheriMode(false);
    }
  }

  // ---------- hazards ----------
  bonk(type = 'banana') {
    if (this.demo || this.invuln > 0 || this.sling || this.fallT > 0 || this.dying > 0) return;
    this.fx.sparkle(new THREE.Vector3(this.sw.pos.x, this.sw.pos.y + 0.8, 1.8));
    if (this.rage > 0) {
      this.add(10);
      this.sfx('collect', 4);
      return;
    }
    if (this.shield) {
      this.shield = false;
      this.pop('CHAYA SAVE!', 'gold');
      this.sfx('bounce');
      this.invuln = 1;
      return;
    }
    const hit = HITS[type] || HITS.banana;
    this.stunned = hit.stun;
    this.invuln = 0.85;
    this.sw.vel.x *= hit.carry;
    this.sw.vel.y -= hit.drop;
    this.sfx('bonk');
    this.stage.shake = hit.shake;
    this.takeDamage(hit.damage, type);
    if (this.health > 0) this.addTheri(type === 'coconut' ? 0.38 : 0.26);
  }

  takeDamage(amount, hazard) {
    const lost = Math.min(this.health, amount);
    this.health -= lost;
    this.style = null;
    this.perks.breakRhythm();
    this.audio.setFestival?.(0);
    this.combo = 1;
    this.stats.theri++;
    this.pop(`${HITS[hazard]?.label || 'AIYOOO!'} −${lost} HP`, 'damage');
    this.audio.impact(hazard);
    if (this.health > 0) return;
    this.detach();
    this.sling = null;
    this.bounceSpring = null;
    this.pendingCard = null;
    this.acc = 0;
    this.dying = 1.4;
    this.sfx('lose');
    this.audio.stopMusic();
  }

  heal(amount) {
    const gained = Math.min(amount, MAX_HEALTH - this.health);
    this.health += gained;
    return gained;
  }

  bounce(vy, vxMin, label, roof = null) {
    this.perks.breakRhythm();
    this.audio.setFestival?.(0);
    this.bounceSpring = { t: 0, vy, vx: Math.max(this.sw.vel.x, vxMin), roof };
    this.sw.vel.y = 0;
    this.gedi.landed?.();
    this.bounceCooldown = 0.22;
    this.sfx('bounce');
    this.pop(label || pick(CALLOUTS.bounce), 'good');
    this.fx.dust(new THREE.Vector3(this.sw.pos.x, this.sw.pos.y - FEET, 1.8));
  }

  fall() {
    if (this.demo || this.rage > 0 || this.shield) {
      const label = this.demo ? '' : this.rage > 0 ? 'RAGE BOUNCE!' : 'CHAYA SAVE!';
      if (this.rage <= 0) this.shield = false;
      this.sw.pos.y = FEET + 0.05;
      this.bounce(17, 8, label);
      this.invuln = 1;
      return;
    }
    const p = new THREE.Vector3(this.sw.pos.x, 0.2, 1.8);
    this.detach();
    this.bounceSpring = null;
    this.acc = 0;
    this.stunned = 0;
    this.stage.shake = 0.3;
    if (this.cfg.water) { this.fx.splash(p); this.sfx('splash'); } else { this.fx.dust(p); this.sfx('thud'); }
    this.takeDamage(FALL_DAMAGE);
    if (this.health > 0) {
      this.fallT = 0.9;
      this.addTheri(0.5);
    }
    this.sw.vel.x = 0;
    this.sw.vel.y = 0;
    this.sw.pos.y = FEET - 0.3;
  }

  // ---------- main loop ----------
  update(rawDt) {
    if (!this.running || this.paused) return;
    let dt = Math.min(rawDt, 0.1);
    this.teaSlow = Math.max(0, this.teaSlow - dt);
    if (this.teaSlow > 0 && this.slowmo <= 0) dt *= 0.7 + 0.3 * (1 - Math.sin(Math.PI * Math.min(1, this.teaSlow / 0.65)));
    if (this.slowmo > 0) { this.slowmo -= dt; dt *= 0.3; }
    this.t += dt;
    this.time += rawDt;

    if (this.dying > 0) {
      this.dying -= rawDt;
      this.level.stepTraffic(dt);
      this.tickVisuals(dt);
      if (this.dying <= 0) this.end();
      return;
    }
    if (this.fallT > 0) {
      this.fallT -= dt;
      this.level.stepTraffic(dt);
      this.tickVisuals(dt);
      if (this.fallT <= 0) {
        this.hangFrom(this.level.respawnElephant(this.sw.pos.x));
        this.invuln = 2;
        this.holding = true;
        this.stage.follow(this.sw.pos, this.sw.vel, 1, true);
      }
      return;
    }

    if (this.demo) this.autopilot();
    this.invuln = Math.max(0, this.invuln - dt);
    this.stunned = Math.max(0, this.stunned - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.magnet = Math.max(0, this.magnet - dt);
    this.bounceCooldown = Math.max(0, (this.bounceCooldown || 0) - dt);
    this.tickRage(dt);

    const { x: beforeX, y: beforeY } = this.sw.pos;
    if (this.sling) {
      this.level.stepTraffic(dt);
      this.tickSling(dt);
    } else {
      this.acc += dt;
      while (this.acc >= STEP) {
        this.acc -= STEP;
        this.physicsStep();
        if (this.fallT > 0 || this.dying > 0 || this.sling) break;
      }
    }
    if (!this.fallT && !this.dying) this.tickWorld(dt, beforeX, beforeY);
    this.tickVisuals(dt);

    if (this.pendingCard && this.slowmo <= 0) {
      const card = this.pendingCard;
      this.pendingCard = null;
      this.emit('chapter', card);
    }
  }

  autopilot() {
    const v = this.sw.vel;
    if (this.current) {
      if (v.x > 3 && Math.hypot(v.x, v.y) > 6 && Math.atan2(v.y, v.x) > 0.5) this.holding = false;
    } else {
      this.holding = v.y < 1;
    }
  }

  physicsStep() {
    const sw = this.sw;
    const previousX = sw.pos.x;
    const previousFeet = sw.pos.y - FEET;
    this.level.stepTraffic?.(STEP);
    if (this.holding && !this.current) {
      const exclude = this.cooldown > 0 ? this.lastReleased : null;
      const a = this.level.findAnchor(sw.pos.x, sw.pos.y, TUNING.grabRadius, exclude);
      if (a) this.attach(a);
    } else if (!this.holding && this.current) {
      this.release();
    }
    if (this.current && this.sneezeT > 0) {
      this.sneezeT -= STEP;
      if (this.sneezeT <= 0) {
        const el = this.current.el;
        el.sneezed = true;
        this.detach();
        sw.vel.x = 11;
        sw.vel.y = 18;
        this.fx.sneeze(el.trunkAnchor.pos.clone().setZ(1.5));
        this.sfx('sneeze');
        this.pop('AACHOO!', 'good');
      }
    }
    if (this.bounceSpring && !this.current) {
      const bounce = this.bounceSpring;
      bounce.t += STEP;
      if (bounce.t < 0.075) {
        if (bounce.roof) {
          const { mesh, previousX } = bounce.roof;
          sw.pos.x += mesh.position.x - previousX;
          sw.pos.y = FEET + mesh.position.y + mesh.userData.top;
        } else {
          sw.pos.x += bounce.vx * STEP * 0.6;
        }
        sw.vel.y = 0;
        return;
      }
      sw.vel.x = bounce.vx;
      sw.vel.y = bounce.vy;
      this.bounceSpring = null;
    }
    sw.step(STEP);

    const feet = sw.pos.y - FEET;
    if (this.current) {
      // feet scrape the ground instead of dying while the trunk hauls him up
      if (feet < 0) {
        sw.pos.y = FEET;
        sw.vel.y = Math.max(sw.vel.y, 0);
        this.dustT -= STEP;
        if (this.dustT <= 0) {
          this.dustT = 0.15;
          if (!this.cfg.water) this.fx.dust(new THREE.Vector3(sw.pos.x, 0.1, 1.8));
        }
      }
      return;
    }
    if (!this.bounceCooldown) {
      let contact = null;
      for (const e of this.level.elephants) {
        const top = e.parasolTop();
        if (!top || previousFeet < top.y || feet > top.y || feet >= previousFeet) continue;
        const time = (previousFeet - top.y) / (previousFeet - feet);
        if (Math.abs(THREE.MathUtils.lerp(previousX, sw.pos.x, time) - top.x) >= top.r) continue;
        if (!contact || time < contact.time) contact = { time, surface: top.y };
      }
      for (const list of [this.level.vehicles, this.level.boats]) {
        for (const b of list) {
          const { top, half, center = 0 } = b.mesh.userData;
          const { x, y } = b.mesh.position;
          const oldX = b.previousX ?? x;
          const gap = previousFeet - (top + (b.previousY ?? y));
          const nextGap = feet - (top + y);
          if (gap < 0 || nextGap > 0 || nextGap >= gap) continue;
          const time = gap / (gap - nextGap);
          if (contact && time >= contact.time) continue;
          const roofX = THREE.MathUtils.lerp(oldX, x, time) + center;
          if (Math.abs(THREE.MathUtils.lerp(previousX, sw.pos.x, time) - roofX) >= half) continue;
          contact = { time, surface: top + y, roof: b };
        }
      }
      if (contact) {
        sw.pos.y = contact.surface + FEET;
        const roof = contact.roof;
        if (!roof) {
          this.bounce(15, 6, 'KUDAMATTAM BOING!');
        } else {
          const { launch, kind } = roof.mesh.userData;
          const lift = launch ? THREE.MathUtils.clamp(launch.up - sw.vel.y * 0.13, launch.up, launch.up + 3) : 15;
          const forward = launch ? launch.forward : 9;
          if (roof.ambush) {
            this.add(60);
            roof.ambush = false;
            roof.label = 'AUTO CHETTAN SAVE!';
            roof.mesh.userData.shortcutMarker.visible = false;
            this.bounce(lift, forward, 'AUTO SHORTCUT +60', roof);
          } else if (roof.rescueBonus) {
            this.add(roof.rescueBonus);
            roof.rescueBonus = 0;
            this.bounce(lift, forward, 'VALLAMKALI RESCUE +45', roof);
          } else {
            this.bounce(lift, forward, roof.label, roof);
          }
          if (kind) this.sfx('horn', kind === 'bus' ? 1 : 1.45);
        }
        return;
      }
      const slingReach = this.cfg?.water ? .88 : 1.4;
      if (sw.vel.y < 0 && feet < slingReach) {
        const el = this.level.findAnjaam(sw.pos.x);
        if (el) {
          this.startSling(el);
          return;
        }
      }
    }
    if (feet < 0) this.fall();
  }

  tickVisuals(dt) {
    const sw = this.sw;
    const anchor = this.current ? this.current.pos : this.sling ? this.sling.base : null;
    const hands = this.gedi.update(dt, {
      pos: sw.pos, vel: sw.vel, anchor, stunned: this.stunned, shield: this.shield, invuln: this.invuln, t: this.t,
    });
    if (this.current) this.current.el.setHands(hands);
    if (this.sling) this.sling.el.setHands(hands);
    const camX = this.stage.camera.position.x;
    this.level.update(dt, this.t, camX, sw.pos, this.magnet > 0);
    this.env.update(dt, this.t, camX);
    this.fx.update(dt);
    this.aim.update(this);
    this.stage.follow(sw.pos, sw.vel, dt);
    this.hud.update(this.snapshot());
    if (this.teach) this.tickTutorial();
  }

  tickTutorial() {
    const hold = this.touch ? 'TOUCH & HOLD' : 'HOLD (mouse or space)';
    const drop = this.touch ? 'LIFT your finger' : 'LET GO';
    let hint = null;
    if (this.sling || this.fallT > 0 || this.dying > 0) hint = null;
    else if (this.current && this.tut.releases < 3) hint = `${drop} when the dots point up ↗`;
    else if (!this.current && this.tut.grabs < 4) hint = `${hold} to grab the gold ring`;
    this.hud.hint(hint);
    if (this.tut.releases >= 3 && this.tut.grabs >= 4) {
      this.teach = false;
      this.hud.hint(null);
    }
  }

  end() {
    this.running = false;
    this.aim.hide();
    this.emit('over', {
      score: this.score,
      distance: Math.floor(this.distance - this.startX),
      chapter: chapterAt(this.distance).index + 1,
      elephants: this.stats.elephants,
      perfects: this.stats.perfects,
      anjaam: this.stats.anjaam,
      theri: this.stats.theri,
      teaCombos: this.perks.teaCombos, rhythmBest: this.perks.bestRhythm,
      names: this.stats.names,
      duration: Math.max(1, Math.round(this.time)),
    });
  }
}

Object.assign(Game.prototype, Encounters);
