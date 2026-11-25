export const WIDTH = 420;
export const HEIGHT = 660;
export const SHOT_ORIGIN = { x: 229, y: 531 };
const FACE = { x: 133, y: 521 };
const ENTRY_TIME = .85;
const WARNING_TIME = .72;
const CHARGE_START = .43;
const CHARGE_END = .76;
const SHOT_COOLDOWN = .25;

export const NIGHTS = [
  { name: 'Lights Out', detail: 'One mosquito at a time', duration: 34, interval: 5.1, cap: 1, pattern: 'calm' },
  { name: 'Ceiling Fan', detail: 'Fast sideways flights', duration: 38, interval: 3.55, cap: 2, pattern: 'fan' },
  { name: 'Monsoon Night', detail: 'Mosquitoes attack in pairs', duration: 42, interval: 5.2, cap: 4, pattern: 'rain' },
  { name: 'Endless Buzz', detail: 'Survive as long as you can', duration: Infinity },
];

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
  return {
    x: bug.xHome + Math.sin(phase) * bug.width,
    y: bug.yHome + Math.sin(phase * .79 + bug.phase) * bug.height,
    facing: Math.cos(phase) < 0 ? -1 : 1,
  };
}

function move(bug, time) {
  const age = time - bug.born;
  const warningAge = age - bug.hover;
  if (age < ENTRY_TIME) {
    const start = orbit(bug, 0);
    const p = 1 - (1 - age / ENTRY_TIME) ** 2;
    return { x: bug.edge + (start.x - bug.edge) * p, y: start.y - Math.sin(p * Math.PI) * 34, facing: bug.side };
  }
  if (warningAge < 0) return orbit(bug, age - ENTRY_TIME);
  const perch = orbit(bug, bug.hover - ENTRY_TIME);
  const facing = Math.sign(FACE.x - perch.x) || 1;
  if (warningAge < WARNING_TIME) {
    return { ...perch, x: perch.x + Math.sin(age * 47) * 3 * Math.sin(warningAge * Math.PI / WARNING_TIME), facing, warning: true };
  }
  const p = Math.min(1, (warningAge - WARNING_TIME) / bug.dive) ** 1.5;
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
    this.spawned = 0;
    this.bugs = [];
    this.outcome = null;
  }

  get readyToFire() {
    return !this.outcome && this.time - this.lastShot >= SHOT_COOLDOWN;
  }

  spawn() {
    const endless = this.night.duration === Infinity;
    const pressure = endless ? Math.min(4, Math.floor(this.time / 18)) : 0;
    const pattern = endless ? (pressure === 0 || this.spawned % 3 === 0 ? 'fan' : 'rain') : this.night.pattern;
    const interval = endless ? 3.7 - pressure * .45 : this.night.interval;
    const capacity = endless ? 2 + pressure : this.night.cap;
    const count = Math.min(capacity - this.bugs.length, pattern === 'rain' ? 2 : 1);
    if (count < 1) {
      this.nextSpawn = this.time + .2;
      return;
    }
    this.nextSpawn = this.time + interval;
    const entrySide = this.spawned % 2 === 0 ? 1 : -1;
    for (let i = 0; i < count; i++) {
      const id = this.spawned++;
      const side = i === 0 ? entrySide : -entrySide;
      const calm = pattern === 'calm';
      const fan = pattern === 'fan';
      const bug = {
        id, side, born: this.time, edge: side === 1 ? -26 : WIDTH + 26,
        xHome: calm ? 130 + id % 3 * 77 : fan ? 210 : 210 - side * 50,
        yHome: id === 0 && calm ? 248 : 160 + this.random() * 155,
        width: calm ? 39 : fan ? 157 : 92,
        height: calm ? 21 : fan ? 36 : 48,
        phase: calm ? 0 : -side * Math.PI / 2,
        speed: (calm ? 1.25 : fan ? 2.07 : 1.9) + pressure * .17,
        hover: (calm ? 4.8 : fan ? 4.45 : 4.2) + i * .65 - pressure * .19,
        dive: calm ? .92 : Math.max(.45, .77 - pressure * .07),
      };
      Object.assign(bug, move(bug, this.time));
      this.bugs.push(bug);
    }
  }

  update(dt) {
    if (this.outcome) return [];
    const events = [];
    this.time = Math.min(this.time + dt, this.night.duration);
    if (this.time < this.night.duration - 1.35 && this.time >= this.nextSpawn) this.spawn();
    this.bugs = this.bugs.filter(bug => {
      const warning = bug.warning;
      Object.assign(bug, move(bug, this.time));
      if (!warning && bug.warning) events.push({ type: 'warning', x: bug.x, y: bug.y });
      if (this.time - bug.born < bug.hover + WARNING_TIME + bug.dive) return true;
      if (this.bites < 3) {
        this.bites++;
        this.streak = 0;
        events.push({ type: 'bite', x: FACE.x, y: FACE.y, first: this.bites === 1 });
      }
      return false;
    });
    if (this.bites >= 3) this.outcome = 'lost';
    else if (this.time >= this.night.duration) this.outcome = 'cleared';
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
    return { direction, perfect, hits, bigCombo: Math.floor(this.streak / 5) > Math.floor(previousStreak / 5) };
  }
}
