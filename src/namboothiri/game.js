export const WIDTH = 420;
export const HEIGHT = 660;
export const SHOT_ORIGIN = { x: 229, y: 531 };
const FACE = { x: 133, y: 521 };
const CHARGE_START = .43;
const CHARGE_END = .76;
const SHOT_COOLDOWN = .25;
const SUPPLY_AMMO = 2;

export const NIGHTS = [
  { name: 'Lights Out', detail: 'Steady fliers', duration: 34, ammo: 11, interval: 3.6, cap: 2, batch: 1, flights: ['steady', 'steady', 'steady', 'sweep'] },
  { name: 'Ceiling Fan', detail: 'Dashers and pairs', duration: 38, ammo: 14, interval: 2.9, cap: 3, batch: 1, flights: ['sweep', 'dart', 'sweep'] },
  { name: 'Monsoon Night', detail: 'Three-bug swarms', duration: 42, ammo: 20, interval: 3.4, cap: 4, batch: 2, flights: ['sweep', 'dart', 'dart'] },
  { name: 'Endless Buzz', detail: 'Escalating swarms', duration: Infinity, ammo: 15, interval: 2.9, cap: 4, batch: 2, flights: ['dart', 'sweep', 'dart', 'steady'] },
];

const FLIGHTS = {
  steady: { width: 39, height: 21, speed: 1.25, hover: 4.8, warning: .72, dive: .92 },
  sweep: { width: 144, height: 33, speed: 2.05, hover: 4.35, warning: .64, dive: .79 },
  dart: { width: 96, height: 59, speed: 2.65, hover: 3.75, warning: .59, dive: .7 },
};

export function chargeState(held) {
  return {
    fill: Math.min(1, held / CHARGE_END),
    ready: held >= CHARGE_START && held <= CHARGE_END,
    past: held > CHARGE_END,
  };
}

export function aimDirection(target) {
  const x = target.x - SHOT_ORIGIN.x;
  const y = Math.min(-8, target.y - SHOT_ORIGIN.y);
  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
}

function orbit(bug, age) {
  const phase = age * bug.speed + bug.phase;
  const isDart = bug.flight === 'dart';
  const heading = isDart ? phase + .35 * Math.sin(phase * 2) : phase;
  return {
    x: bug.xHome + Math.sin(heading) * bug.width,
    y: bug.yHome + Math.sin(phase * (isDart ? 1.5 : .79) + bug.phase) * bug.height,
    facing: Math.cos(heading) < 0 ? -1 : 1,
  };
}

function move(bug, time) {
  const age = time - bug.born;
  const warningAge = age - bug.hover;
  if (age < bug.entry) {
    const start = orbit(bug, 0);
    const p = 1 - (1 - age / bug.entry) ** 2;
    return { x: bug.edge + (start.x - bug.edge) * p, y: start.y - Math.sin(p * Math.PI) * 34, facing: bug.side };
  }
  if (warningAge < 0) return orbit(bug, age - bug.entry);
  const perch = orbit(bug, bug.hover - bug.entry);
  const facing = Math.sign(FACE.x - perch.x) || 1;
  if (warningAge < bug.warningTime) {
    return { ...perch, x: perch.x + Math.sin(age * 47) * 3 * Math.sin(warningAge * Math.PI / bug.warningTime), facing, warning: true };
  }
  const p = Math.min(1, (warningAge - bug.warningTime) / bug.dive) ** 1.5;
  return {
    x: perch.x + (FACE.x - perch.x) * p + Math.sin(p * Math.PI) * 19 * facing,
    y: perch.y + (FACE.y - perch.y) * p,
    facing, warning: true,
  };
}

export class NightRun {
  constructor(level, random = Math.random) {
    this.level = level;
    this.night = NIGHTS[level];
    this.random = random;
    this.time = 0;
    this.nextSpawn = .55;
    this.lastShot = -Infinity;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.hits = 0;
    this.shots = 0;
    this.landedShots = 0;
    this.bites = 0;
    this.ammo = this.night.ammo;
    this.spawned = 0;
    this.groups = 0;
    this.bugs = [];
    this.outcome = null;
    this.lossCause = null;
  }

  get wave() {
    const { duration } = this.night;
    if (duration === Infinity) return 1 + Math.floor(this.time / 12);
    return Math.min(3, 1 + Math.floor(this.time * 3 / duration));
  }

  get readyToFire() {
    return !this.outcome && this.ammo > 0 && this.time - this.lastShot >= SHOT_COOLDOWN;
  }

  spawn() {
    const { night } = this;
    const endless = night.duration === Infinity;
    const pressure = Math.min(7, this.wave - 1);
    const interval = Math.max(endless ? 1.35 : 2.15, night.interval - pressure * .33);
    const capacity = night.cap + Math.min(pressure, endless ? 4 : 2);
    const surge = this.level === 0 ? pressure >= 2 && this.groups % 3 === 2 : pressure > 0 && this.groups % 2 === 1;
    const count = Math.min(capacity - this.bugs.length, night.batch + Number(surge));
    if (count < 1) {
      this.nextSpawn = this.time + .2;
      return;
    }
    this.nextSpawn = this.time + interval;
    const entrySide = this.groups++ % 2 === 0 ? 1 : -1;
    for (let i = 0; i < count; i++) {
      const id = this.spawned++;
      const side = i % 2 ? -entrySide : entrySide;
      const flight = this.level === 0 && pressure === 0 ? 'steady' : night.flights[id % night.flights.length];
      const profile = FLIGHTS[flight];
      const steady = flight === 'steady';
      const speedUp = this.level * .13 + pressure * .09;
      const bug = {
        id, side, flight, supply: (id + 1) % (endless ? 5 : 6) === 0,
        born: this.time + i * .16, edge: side === 1 ? -26 : WIDTH + 26,
        xHome: steady ? 130 + id % 3 * 77 : 210 - side * (flight === 'dart' ? 46 : 12),
        yHome: id === 0 && steady ? 248 : 140 + this.random() * 153 + i * 19,
        width: profile.width, height: profile.height,
        phase: steady ? 0 : -side * Math.PI / 2 + (i === 2 ? .75 : 0),
        speed: profile.speed * (1 + speedUp),
        entry: Math.max(.36, .85 - this.level * .05 - pressure * .045),
        hover: Math.max(1.65, profile.hover + i * .26 - this.level * .18 - pressure * .24),
        warningTime: Math.max(.29, profile.warning - this.level * .045 - pressure * .049),
        dive: Math.max(.32, profile.dive - this.level * .05 - pressure * .057),
      };
      Object.assign(bug, move(bug, bug.born));
      this.bugs.push(bug);
    }
  }

  update(dt) {
    if (this.outcome) return [];
    const events = [];
    const previousWave = this.wave;
    this.time = Math.min(this.time + dt, this.night.duration);
    if (this.wave > previousWave) events.push({ type: 'wave', number: this.wave, faster: this.wave <= 8 });
    if (this.time < this.night.duration - 1.35 && this.time >= this.nextSpawn) this.spawn();
    this.bugs = this.bugs.filter(bug => {
      if (this.time < bug.born) return true;
      const warning = bug.warning;
      Object.assign(bug, move(bug, this.time));
      if (!warning && bug.warning) events.push({ type: 'warning', x: bug.x, y: bug.y });
      if (this.time - bug.born < bug.hover + bug.warningTime + bug.dive) return true;
      if (this.bites < 3) {
        this.bites++;
        this.streak = 0;
        events.push({ type: 'bite', x: FACE.x, y: FACE.y, first: this.bites === 1 });
      }
      return false;
    });
    if (this.bites >= 3) {
      this.outcome = 'lost';
      this.lossCause = 'bites';
    } else if (this.time >= this.night.duration) {
      this.outcome = 'cleared';
    } else if (this.ammo === 0) {
      this.outcome = 'lost';
      this.lossCause = 'ammo';
    }
    if (this.outcome) events.push({ type: this.outcome });
    return events;
  }

  shoot(target, held, aimPadding = 0) {
    if (!this.readyToFire) return null;
    const direction = aimDirection(target);
    const perfect = chargeState(held).ready;
    const hits = [];
    for (const bug of this.bugs) {
      if (bug.x < 5 || bug.x > WIDTH - 5) continue;
      const x = bug.x - SHOT_ORIGIN.x;
      const y = bug.y - SHOT_ORIGIN.y;
      const distance = x * direction.x + y * direction.y;
      const offset = Math.abs(x * direction.y - y * direction.x);
      if (distance > 0 && offset <= (perfect ? 33 : 18) + aimPadding) hits.push({ bug, distance });
    }
    hits.sort((a, b) => a.distance - b.distance);
    hits.length = Math.min(hits.length, perfect ? 2 : 1);
    const hitIds = new Set(hits.map(({ bug }) => bug.id));
    this.bugs = this.bugs.filter(bug => !hitIds.has(bug.id));
    this.lastShot = this.time;
    this.shots++;
    this.ammo--;
    const supplyAmmo = hits.filter(hit => hit.bug.supply).length * SUPPLY_AMMO;
    const doubleRefund = Number(hits.length === 2);
    const ammoGained = Math.min(this.night.ammo - this.ammo, supplyAmmo + doubleRefund);
    this.ammo += ammoGained;
    if (hits.length) this.landedShots++;
    else this.streak = 0;
    const previousStreak = this.streak;
    for (const hit of hits) {
      this.streak++;
      this.hits++;
      hit.points = 100 + (perfect ? 50 : 0) + Math.min(this.streak - 1, 9) * 15;
      this.score += hit.points;
    }
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    return { direction, perfect, hits, ammoGained, bigCombo: Math.floor(this.streak / 5) > Math.floor(previousStreak / 5) };
  }
}
