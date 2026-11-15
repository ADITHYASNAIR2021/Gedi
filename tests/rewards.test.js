import test from 'node:test';
import assert from 'node:assert/strict';
import { RunPerks } from '../src/game/perks.js';
import { spring } from '../src/core/motion.js';
import { Swinger, launchVelocity } from '../src/game/swing.js';
import { personalityFor } from '../src/game/personalities.js';
import { Game } from '../src/game/game.js';

test('chaya and pazhampori reward either collection order once per flight', () => {
  for (const order of [['chaya','fritter'],['fritter','chaya']]) {
    const perks = new RunPerks(); perks.launch();
    assert.equal(perks.collect(order[0], 1), false);
    assert.equal(perks.collect(order[1], 2), true);
    assert.equal(perks.collect('chaya', 2.1), false);
    assert.equal(perks.teaCombos, 1); assert.equal(perks.teaCharge, true);
    assert.equal(perks.launch(), 1.08); assert.equal(perks.launch(), 1);
  }
});

test('snacks collected on separate flights or while hanging cannot form a combo', () => {
  const perks = new RunPerks(); assert.equal(perks.collect('chaya', 0), false);
  perks.launch(); perks.collect('chaya', 1); perks.land(false);
  assert.equal(perks.collect('fritter', 1.1), false);
  perks.launch(); assert.equal(perks.collect('fritter', 2), false);
  assert.equal(perks.teaCharge, false);
});

test('rhythm rises at 3, 6 and 9 successful timed catches and breaks on a miss', () => {
  const perks = new RunPerks();
  for (let i = 1; i <= 12; i++) {
    assert.equal(perks.land(true), i % 3 === 0);
    assert.equal(perks.level, Math.min(3, Math.floor(i / 3)));
  }
  perks.land(false); assert.equal(perks.rhythm, 0); assert.equal(perks.level, 0);
  assert.equal(perks.bestRhythm, 12);
  perks.reset(); assert.equal(perks.bestRhythm, 0); assert.equal(perks.teaCombos, 0);
});

test('pickup integration awards +75, keeps the shield and queues the next boost', () => {
  const game = Object.create(Game.prototype);
  Object.assign(game, { perks: new RunPerks(), t: 1, bonus: 0, rage: 0, combo: 1,
    sfx() {}, pop() {}, fx: { marigolds() {} }, sw: { pos: { x: 0, y: 4 } } });
  game.perks.launch(); game.collect('fritter'); game.collect('chaya');
  assert.equal(game.bonus, 78); assert.equal(game.shield, true); assert.equal(game.teaSlow, .65);
  assert.equal(game.perks.teaCharge, true);
});

test('spring reaches the same position at 30, 60 and 120fps without overshooting', () => {
  const results = [];
  for (const fps of [30, 60, 120]) {
    let x = 0, velocity = 0;
    for (let i = 0; i < fps; i++) {
      [x, velocity] = spring(x, velocity, 10, 6, 1 / fps);
      assert.ok(x >= 0 && x <= 10);
    }
    results.push(x);
  }
  assert.ok(Math.max(...results) - Math.min(...results) < 1e-10);
});

test('a catch preserves incoming velocity and builds assistance gradually', () => {
  const sw = new Swinger(); sw.reset(.4, 3.4); sw.vel.x = 2; sw.vel.y = 1;
  sw.attach({ pos: { x: 0, y: 6 } });
  assert.deepEqual(sw.vel, { x: 2, y: 1 });
  sw.step(1 / 120);
  assert.ok(sw.vel.x < 3);
});

test('tea launch and its ballistic preview use the same speed-capped boost', () => {
  const sw = new Swinger(); sw.reset(0, 8); Object.assign(sw.vel, { x: 11, y: 10 });
  const points = Array.from({ length: 10 }, () => ({})); sw.predict(points, .1, true, 1.08);
  Object.assign(sw.vel, launchVelocity(sw.vel, true, 1.08));
  for (let i = 0; i < 120; i++) {
    sw.step(1 / 120);
    if ((i + 1) % 12 === 0) {
      const p = points[(i + 1) / 12 - 1]; assert.ok(Math.hypot(p.x - sw.pos.x, p.y - sw.pos.y) < 1e-6);
    }
  }
});

test('personalities are stable, readable and retain special elephant warnings', () => {
  assert.equal(personalityFor('normal', 'Kannan'), personalityFor('normal', 'Kannan'));
  assert.equal(personalityFor('sleepy').detail, 'Drooping trunk');
  assert.equal(personalityFor('sneezy').detail, 'Sneeze launch');
  assert.ok(personalityFor('normal', 'Kannan').pump > .8);
});
