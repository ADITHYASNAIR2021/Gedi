import test from 'node:test';
import assert from 'node:assert/strict';
import { Swinger, TUNING, perfectRelease, launchVelocity } from '../src/game/swing.js';
import { Game } from '../src/game/game.js';
import { CHAPTERS, ENCORE, Route, chapterStart, routeProgress } from '../src/game/story.js';
import { Kuttappan } from '../src/game/kuttappan.js';
import { Fx } from '../src/world/fx.js';
import * as THREE from 'three';

const step = 1 / 120;
const finite = sw => Object.values(sw.pos).concat(Object.values(sw.vel)).every(Number.isFinite);

test('swing stays finite, bounded and clear of the ground through 2 minutes', () => {
  const sw = new Swinger();
  const anchor = { pos: { x: 0, y: 6 }, vel: { x: 0, y: 0 } };
  sw.reset(0.4, 3.4); sw.attach(anchor);
  for (let i = 0; i < 120 * 120; i++) {
    sw.step(step);
    assert.ok(finite(sw));
    assert.ok(Math.hypot(sw.pos.x, sw.pos.y - 6) <= sw.len + 1e-8);
    assert.ok(Math.hypot(sw.vel.x, sw.vel.y) <= TUNING.maxSpeed + 1e-8);
    assert.ok(sw.pos.y >= TUNING.groundClear - 1e-8);
  }
});

test('coincident anchor and long catch remain stable while reeling', () => {
  for (const point of [[0, 6], [6, 1], [-6, 3]]) {
    const sw = new Swinger(); sw.reset(...point); sw.attach({ pos: { x: 0, y: 6 } });
    for (let i = 0; i < 1000; i++) sw.step(step);
    assert.ok(finite(sw));
    assert.ok(sw.len <= 4.001);
  }
});

test('moving anchor constrains relative outward velocity', () => {
  const sw = new Swinger();
  const anchor = { pos: { x: 0, y: 6 }, vel: { x: 0, y: 0 } };
  sw.reset(.4, 3.4); sw.attach(anchor);
  for (let i = 0; i < 2400; i++) {
    const t = i * step;
    anchor.pos.x = Math.sin(t) * .7; anchor.vel.x = Math.cos(t) * .7;
    sw.step(step); assert.ok(finite(sw));
    assert.ok(Math.hypot(sw.pos.x - anchor.pos.x, sw.pos.y - anchor.pos.y) <= sw.len + 1e-8);
  }
});

test('ballistic dots agree with actual boosted release within 11cm', () => {
  for (const beat of [false, true]) {
    const sw = new Swinger(); sw.reset(0, 8); Object.assign(sw.vel, { x: 10, y: 11 });
    const points = Array.from({ length: 12 }, () => ({})); sw.predict(points, .1, beat);
    Object.assign(sw.vel, launchVelocity(sw.vel, beat));
    for (let i = 0; i < 144; i++) {
      sw.step(step);
      if ((i + 1) % 12 === 0) {
        const p = points[(i + 1) / 12 - 1];
        assert.ok(Math.hypot(p.x - sw.pos.x, p.y - sw.pos.y) < .11);
      }
    }
  }
});

test('preview also respects the speed limit during fast falling releases', () => {
  const sw = new Swinger(); sw.reset(0, 14); Object.assign(sw.vel, { x: 20, y: -18 });
  const points = Array.from({ length: 12 }, () => ({})); sw.predict(points, .1);
  Object.assign(sw.vel, launchVelocity(sw.vel));
  for (let i = 0; i < 144; i++) {
    sw.step(step);
    if ((i + 1) % 12 === 0) {
      const p = points[(i + 1) / 12 - 1];
      assert.ok(Math.hypot(p.x - sw.pos.x, p.y - sw.pos.y) < 1e-6);
    }
  }
});

test('perfect windows reject downward, backward and slow releases', () => {
  assert.equal(perfectRelease({ x: 10, y: 10 }), true);
  for (const v of [{ x: 10, y: -5 }, { x: -10, y: 10 }, { x: 1, y: 1 }, { x: 1, y: 15 }]) assert.equal(perfectRelease(v), false);
});

function landingFixture(y, vy, top = 2.9) {
  const game = Object.create(Game.prototype);
  game.sw = new Swinger(); game.sw.reset(0, y); game.sw.vel.y = vy;
  Object.assign(game, { holding: false, current: null, cooldown: 0, bounceCooldown: 0,
    level: { elephants: [], vehicles: [{ mesh: { position: { x: 0, y: 0 }, userData: { top, half: 4.5 } }, label: 'BUS' }], boats: [], findAnjaam: () => null },
    fall: () => {}, bounce: () => { game.bounced = true; },
  });
  return game;
}

test('roof landing detects a fast crossing and places feet on the surface', () => {
  const game = landingFixture(4.7, -24);
  game.physicsStep();
  assert.equal(game.bounced, true);
  assert.ok(Math.abs(game.sw.pos.y - 1.15 * 1.45 - 2.9) < 1e-8);
});

test('passing below a roof cannot trigger a ghost rescue', () => {
  const game = landingFixture(3.9, -8);
  game.physicsStep(); assert.equal(game.bounced, undefined);
});

test('30, 60 and 120fps feed the same fixed-step swing', () => {
  const simulate = fps => {
    const sw = new Swinger(); sw.reset(.4, 3.4); sw.attach({ pos: { x: 0, y: 6 } });
    let acc = 0;
    for (let i = 0; i < fps * 8; i++) {
      acc += 1 / fps;
      while (acc >= step - 1e-10) { sw.step(step); acc -= step; }
    }
    return sw.pos;
  };
  const reference = simulate(120);
  for (const fps of [30, 60]) assert.deepEqual(simulate(fps), reference);
});

test('chapter starts, early victory and Encore leg breaks resolve to the same route for the world and meter', () => {
  const route = new Route();
  for (const [i, cfg] of CHAPTERS.entries()) {
    route.reset(i);
    const chapter = route.at(chapterStart(i));
    assert.equal(chapter.cfg, cfg);
    assert.equal(routeProgress(chapter, chapterStart(i)).progress, 0);
  }
  assert.equal(route.at(2500).index, ENCORE - 1);
  route.startEncore(1880);
  assert.equal(route.at(1879).index, ENCORE - 1);
  const first = route.at(1880);
  assert.equal(first.region, 0);
  assert.equal(routeProgress(first, 2130).progress, .5);
  const second = route.at(2380);
  assert.equal(second.region, 1);
  assert.equal(second.leg, 2);
  assert.equal(routeProgress(second, 2380).progress, 0);
  route.reset(ENCORE);
  assert.equal(route.at(chapterStart(ENCORE)).leg, 1);
  assert.equal(new Route().at(2380).encore, false);
});

test('boss catches advance normal chapters; the finale needs three distinct hits', () => {
  const scene = new THREE.Scene();
  const group = new THREE.Group(); scene.add(group);
  const el = { group };
  const level = { topAt: () => 4, perchFor: () => el };
  for (const chapter of [0, 1, 2, 3, 4]) {
    const boss = new Kuttappan(scene); boss.reset(0, chapter);
    const need = chapter === 4 ? 3 : 1;
    for (let i = 0; i < need; i++) {
      boss.el = el; boss.state = 'sit';
      const event = boss.update(step, 0, { x: -2.3, y: 5.1 }, 12, level);
      assert.equal(event.type, i === need - 1 ? 'caught' : 'hit');
      assert.equal(event.chapter ?? chapter, chapter);
    }
    assert.equal(boss.active, false);
  }
});

test('a fast sweep through Kuttappan counts as a bonk even when neither endpoint touches', () => {
  const scene = new THREE.Scene();
  const group = new THREE.Group(); scene.add(group);
  const boss = new Kuttappan(scene);
  boss.reset(0, ENCORE - 1);
  boss.el = { group };
  boss.state = 'sit';
  const hit = boss.update(1 / 30, 0, { x: 1, y: 5.1 }, 12, {}, -6, 5.1);
  assert.equal(hit.type, 'hit');
  assert.equal(hit.hits, 1);
});

test('pooled particles use one draw object and fully expire', () => {
  const scene = new THREE.Scene(); const fx = new Fx(scene);
  assert.equal(scene.children.length, 1);
  for (let i = 0; i < 15; i++) fx.firework(new THREE.Vector3());
  fx.update(step);
  assert.equal(fx.mesh.visible, true);
  for (let i = 0; i < 400; i++) fx.update(step);
  assert.equal(fx.mesh.visible, false);
  assert.ok(fx.items.every(p => p.life === 0));
  assert.equal(scene.children.length, 1);
});
