// Procedural generator: elephants, pickups, vehicles, boats and banana-throwing monkeys per chapter.
import { Elephant } from '../entities/elephant.js';
import {
  makeFritter, makeChaya, makeChakka, makeChilli, makePorotta, makeMonkey, makePedestal,
} from '../entities/props.js';
import { makeBus, makeAuto } from '../entities/vehicles.js';
import { makeVallam, animateVallam, VALLAM_FOOTPRINT } from '../entities/vallam.js';
import { Route, chapterStart, ELEPHANT_NAMES, ELEPHANT_HOMES, pick } from './story.js';
import { AANAS, aanaAt } from './aanas.js';

const rand = (a, b) => a + Math.random() * (b - a);
const TRUNK_X = 4.5; // the trunk tip sits this far in front of the elephant's centre
const MAKERS = { fritter: makeFritter, chaya: makeChaya, chakka: makeChakka, mulaku: makeChilli, porotta: makePorotta };
const albumNames = new Set(AANAS.map(aana => aana.name));
const genericNames = ELEPHANT_HOMES.flatMap(home => ELEPHANT_NAMES.map(name => `${home} ${name}`))
  .filter(name => !albumNames.has(name));

export class Level {
  constructor(scene, route = new Route()) {
    this.scene = scene;
    this.route = route;
    this.elephants = [];
    this.items = [];
    this.vehicles = [];
    this.boats = [];
    this.monkeys = [];
    this.lastTailX = 0;
    this.spawnCount = 0;
    this.trafficTime = 0;
    this.featured = new Set();
  }

  reset(startX = 0) {
    this.elephants.forEach((e) => this.removeElephant(e));
    for (const list of [this.items, this.vehicles]) list.forEach((o) => this.scene.remove(o.mesh));
    for (const boat of this.boats) this.removeBoat(boat);
    this.elephants = [];
    this.items = [];
    this.vehicles = [];
    this.boats = [];
    this.monkeys = [];
    this.spawnCount = 0;
    this.trafficTime = 0;
    this.featured.clear();
    const first = this.addElephant(startX + TRUNK_X, { decorated: true, anjaam: true, name: 'Thiruvambadi Kannan' }, 0);
    this.lastTailX = first.tailAnchor.pos.x;
    return first;
  }

  addElephant(x, opts, pedestal) {
    const e = new Elephant(opts);
    e.place(x, pedestal);
    if (pedestal > 0) {
      e.pedestal = makePedestal(pedestal);
      e.pedestal.position.x = x;
      this.scene.add(e.pedestal);
    }
    this.scene.add(e.group);
    e.update(0, 0);
    this.elephants.push(e);
    return e;
  }

  removeElephant(e) {
    this.scene.remove(e.group);
    if (e.pedestal) this.scene.remove(e.pedestal);
    e.dispose();
  }

  spawnNext() {
    const dist = this.lastTailX;
    const { cfg, index, region } = this.route.at(Math.max(0, dist));

    let variant = 'normal';
    const r = Math.random();
    if (r < cfg.baby) variant = 'baby';
    else if (r < cfg.baby + cfg.sleepy) variant = 'sleepy';
    else if (r < cfg.baby + cfg.sleepy + cfg.sneezy) variant = 'sneezy';

    const pooram = region === 0 || region === 4;
    const featured = aanaAt(index, dist - chapterStart(index), this.featured);
    if (featured) {
      this.featured.add(featured.id);
      variant = 'normal';
    }
    const scale = variant === 'baby' ? 0.75 : 1;
    const decorated = !!featured || (pooram ? Math.random() < 0.9 : Math.random() < 0.25);
    const parasol = variant !== 'baby' && Math.random() < cfg.parasol;
    const gap = rand(cfg.gap[0], cfg.gap[1]);
    const trunkX = dist + gap;
    const x = trunkX + TRUNK_X * scale;
    const surface = this.route.at(x).cfg;
    let pedestal = 0;
    if (surface.water) pedestal = rand(0.3, 0.5 + surface.pedestal);
    else if (surface.pedestal && Math.random() < 0.5) pedestal = rand(0.4, surface.pedestal);
    const e = this.addElephant(x, {
      variant, decorated, parasol,
      cloth: featured?.cloth ?? Math.floor(Math.random() * 5),
      name: featured?.name ?? pick(genericNames),
      anjaam: Math.random() < cfg.anjaam,
    }, pedestal);
    e.aana = featured;
    e.sway = Math.random() * cfg.sway;

    // pickups: an arc across the gap, sometimes another over the elephant's back
    const roll = Math.random();
    this.spawnCount++;
    const special = this.spawnCount % 7 === 2 ? 'chaya' : roll < 0.04 ? 'chakka' : roll < 0.1 ? 'chaya' : roll < 0.17 ? 'mulaku' : roll < 0.21 ? 'porotta' : null;
    if (special || roll > 0.36) this.placeArc(dist, trunkX, Math.max(e.trunkAnchor.pos.y, 5) + rand(0.4, 1.4), special);
    if (Math.random() < 0.4) this.placeArc(trunkX + 1.5, e.tailAnchor.pos.x - 1, pedestal + 6.6 * scale + rand(0, 1), null);

    if (variant !== 'baby' && !parasol && Math.random() < cfg.monkey) {
      const m = makeMonkey();
      m.position.set(0.6, 4.1, 0.3);
      e.group.add(m);
      this.monkeys.push({ el: e, mesh: m, cooldown: rand(0.5, 1.5) });
    }

    if (!cfg.water) {
      const roadRoll = Math.random();
      if (roadRoll < cfg.bus) this.addVehicle(makeBus(), x + rand(15, 30), -rand(2, 5), 'KSRTC RESCUE!');
      else if (roadRoll < cfg.bus + cfg.auto) this.addVehicle(makeAuto(), x + rand(8, 25), -rand(3, 7), 'AUTO CHETTAN SAVE!');
    } else if ((index !== 2 || dist >= chapterStart(2) + 60) && Math.random() < cfg.boat) {
      this.addBoat(dist + gap * 0.5, -rand(.7, 2.1));
    }

    this.lastTailX = e.tailAnchor.pos.x;
    return e;
  }

  addVehicle(mesh, x, speed, label) {
    const { footprint } = mesh.userData;
    if (!this.fitsLane(x, footprint, false) || !this.hasTrafficRoom(x, footprint, this.vehicles)) return null;
    mesh.position.set(x, 0, 3.6);
    this.scene.add(mesh);
    const vehicle = { mesh, speed, label, startX: x, previousX: x, previousY: 0 };
    this.vehicles.push(vehicle);
    return vehicle;
  }

  addBoat(x, speed, race = false) {
    if (!this.fitsLane(x, VALLAM_FOOTPRINT, true) || !this.hasTrafficRoom(x, VALLAM_FOOTPRINT, this.boats)) return null;
    const mesh = makeVallam(race);
    mesh.position.set(x, 0, 1.6);
    this.scene.add(mesh);
    const boat = { mesh, speed, previousX: x, previousY: 0, phase: Math.random() * 6, label: 'VALLAM RESCUE!', rescueBonus: race ? 45 : 0 };
    this.boats.push(boat);
    return boat;
  }

  fitsLane(x, [left, right], water) {
    // A hull or vehicle is much shorter than the shortest land or water section.
    return this.route.at(x - left).cfg.water === water && this.route.at(x + right).cfg.water === water;
  }

  hasTrafficRoom(x, [left, right], peers, except) {
    const clearance = 0.8;
    return peers.every(peer => {
      if (peer === except) return true;
      const { position, userData } = peer.mesh;
      const [peerLeft, peerRight] = userData.footprint;
      return x + right + clearance <= position.x - peerLeft || x - left - clearance >= position.x + peerRight;
    });
  }

  refreshAhead(x) {
    // Keep the immediate landing area when the finale changes the route ahead.
    const edge = x + 8;
    this.elephants = this.elephants.filter(el => {
      if (el.group.position.x <= edge || el.held) return true;
      this.removeElephant(el);
      return false;
    });
    this.lastTailX = Math.max(x, ...this.elephants.map(el => el.tailAnchor.pos.x));
    for (const key of ['items', 'vehicles', 'boats']) {
      this[key] = this[key].filter(item => {
        if (item.mesh.position.x <= edge) return true;
        if (key === 'boats') this.removeBoat(item);
        else this.scene.remove(item.mesh);
        return false;
      });
    }
    this.monkeys = this.monkeys.filter(monkey => this.elephants.includes(monkey.el));
  }

  removeBoat(boat) {
    this.scene.remove(boat.mesh);
    for (const part of Object.values(boat.mesh.userData.crew)) part.dispose();
  }

  placeArc(x0, x1, peak, special) {
    const span = x1 - x0;
    if (span < 2.5) return;
    if (special) {
      this.addItem(special, x0 + span / 2, peak + 0.5);
      if (special === 'chaya') {
        this.addItem('fritter', x0 + span * 0.3, peak + 0.1);
        this.addItem('fritter', x0 + span * 0.7, peak + 0.1);
      }
      return;
    }
    const n = Math.min(6, Math.max(3, Math.round(span / 1.8)));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      this.addItem('fritter', x0 + span * t, peak - 2.2 * (2 * t - 1) ** 2);
    }
  }

  addItem(type, x, y) {
    const mesh = MAKERS[type]();
    mesh.position.set(x, y, 1.8);
    this.scene.add(mesh);
    this.items.push({ type, mesh, y, phase: x, taken: false });
  }

  // gedi: {x, y}; magnet pulls pazhampori towards him
  update(dt, t, camX, gedi, magnet) {
    while (this.lastTailX < camX + 110) this.spawnNext();
    const behind = camX - 45;

    this.elephants = this.elephants.filter((e) => {
      if (e.tailAnchor.pos.x < behind && !e.held) {
        this.removeElephant(e);
        return false;
      }
      e.update(dt, t);
      if (e.pedestal) e.pedestal.position.x = e.group.position.x;
      return true;
    });
    this.monkeys = this.monkeys.filter((m) => this.elephants.includes(m.el));

    this.items = this.items.filter((it) => {
      const p = it.mesh.position;
      if (it.taken || p.x < behind) {
        this.scene.remove(it.mesh);
        return false;
      }
      it.mesh.rotation.y += dt * 2.5;
      const dx = gedi.x - p.x;
      const dy = gedi.y - p.y;
      if (magnet && it.type === 'fritter' && Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        it.pulled = true;
        const k = Math.min(1, dt * 9);
        p.x += dx * k;
        p.y += dy * k;
      } else if (!it.pulled) {
        p.y = it.y + Math.sin(t * 3 + it.phase) * 0.15;
      }
      return true;
    });

    this.vehicles = this.vehicles.filter((v) => {
      if (v.mesh.position.x < behind - 20) {
        this.scene.remove(v.mesh);
        return false;
      }
      for (const { rolling, radius } of v.mesh.userData.wheels) {
        rolling.rotation.z = -(v.mesh.position.x - v.startX) / radius;
      }
      return true;
    });
    this.boats = this.boats.filter((b) => {
      if (b.mesh.position.x < behind - 20) {
        this.removeBoat(b);
        return false;
      }
      b.mesh.visible = Math.abs(b.mesh.position.x - camX) < 66;
      if (b.mesh.visible) animateVallam(b.mesh, t + b.phase);
      return true;
    });
  }

  stepTraffic(dt) {
    this.trafficTime += dt;
    for (const vehicle of this.vehicles) this.moveTraffic(vehicle, dt, false);
    for (const boat of this.boats) {
      const p = boat.mesh.position;
      boat.previousY = p.y;
      this.moveTraffic(boat, dt, true);
      p.y = Math.sin(this.trafficTime * 1.5 + boat.phase) * 0.1;
    }
  }

  moveTraffic(traffic, dt, water) {
    const { position, userData } = traffic.mesh;
    traffic.previousX = position.x;
    if (!traffic.speed) return;
    const next = position.x + traffic.speed * dt;
    const edge = traffic.speed < 0 ? next - userData.footprint[0] : next + userData.footprint[1];
    if (this.route.at(edge).cfg.water !== water) {
      traffic.speed = 0;
      return;
    }
    if (this.hasTrafficRoom(next, userData.footprint, water ? this.boats : this.vehicles, traffic)) position.x = next;
  }

  // Best grabbable anchor around Gedi (prefers the ones ahead).
  findAnchor(x, y, radius, exclude) {
    let best = null;
    let bestScore = Infinity;
    for (const e of this.elephants) {
      for (const a of e.anchors) {
        if (a === exclude) continue;
        const dx = a.pos.x - x;
        const dy = a.pos.y - y;
        if (dx < -1.2) continue;
        const d = Math.hypot(dx, dy);
        if (d > radius) continue;
        const score = d - dx * 0.5;
        if (score < bestScore) {
          bestScore = score;
          best = a;
        }
      }
    }
    return best;
  }

  // An elephant whose anjaamkaal is dangling within reach of a falling Gedi.
  findAnjaam(x) {
    for (const e of this.elephants) {
      if (!e.anjaamReady) continue;
      if (Math.abs(x - (e.group.position.x + 0.55 * e.scale)) < 3.6) return e;
    }
    return null;
  }

  respawnElephant(x, chapter) {
    const safe = this.elephants.filter(e => e.variant !== 'sneezy' && this.route.at(e.trunkAnchor.pos.x + .4).key === chapter.key);
    return safe.reduce((best, e) => !best || Math.abs(e.trunkAnchor.pos.x - x) < Math.abs(best.trunkAnchor.pos.x - x) ? e : best, null)
      ?? this.elephants.find(e => e.trunkAnchor.pos.x >= x - 8)
      ?? this.elephants[this.elephants.length - 1];
  }

  // Height of whatever Kuttappan would be running on at x.
  topAt(x) {
    for (const e of this.elephants) {
      const dx = x - e.group.position.x;
      if (dx > -2.8 * e.scale && dx < 2.3 * e.scale) return e.group.position.y + 4.2 * e.scale;
    }
    return 0.3;
  }

  // First full-size elephant whose head is at or beyond x.
  perchFor(x) {
    return this.elephants.find((e) => e.variant !== 'baby' && e.group.position.x - 2.3 >= x - 1) || null;
  }
}
