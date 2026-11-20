import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { makeAuto, makeBus } from '../src/entities/vehicles.js';
import { Game } from '../src/game/game.js';
import { Level } from '../src/game/level.js';
import { RunPerks } from '../src/game/perks.js';
import { CHAPTERS, ENCORE, Route } from '../src/game/story.js';
import { Swinger } from '../src/game/swing.js';

function runFixture() {
  const scene = new THREE.Scene();
  const samples = [];
  const route = new Route();
  const switched = [];
  const game = Object.assign(Object.create(Game.prototype), {
    sw: new Swinger(), perks: new RunPerks(), level: new Level(scene, route), route,
    stage: { scene, setBiome(cfg) { switched.push(cfg.name); } }, fx: { sparkle() {}, dust() {}, confetti() {} },
    env: { setBiome() {} }, hud: { banner() {} }, aim: {},
    gedi: {}, settings: { music: false },
    audio: { impact: (hazard) => samples.push(hazard ?? 'fall'), stopMusic() {}, setTempo() {}, setChapterMusic() {}, beatPhase() { return 1; } },
    health: 100, bonus: 0, combo: 3, shield: false, invuln: 0, stunned: 0, theri: 0, rage: 0,
    demo: false, t: 0, projectiles: [], startX: 0, distance: 0, distPts: 0, caughtKuttappan: false,
    chapter: route.at(0), cfg: CHAPTERS[0], stats: { theri: 0 },
    kutt: { reset(_x, index) { this.index = index; }, pos: new THREE.Vector3(), firstPerch: 1870, hits: 0, need: 3 },
    pop() {}, sfx() {}, tickKuttappan() {}, holding: false, bounceCooldown: 0,
  });
  return { game, samples, switched };
}

test('chaya blocks one hit, recovery blocks a repeat, and chakka caps healing at 100', () => {
  const { game, samples } = runFixture();
  game.shield = true;
  game.bonk('coconut');
  assert.equal(game.shield, false);
  assert.equal(game.health, 100);
  game.bonk('banana');
  assert.equal(game.health, 100);
  assert.deepEqual(samples, []);

  game.invuln = 0;
  game.bonk('coconut');
  game.bonk('banana');
  assert.equal(game.health, 75);
  assert.equal(game.combo, 1);
  assert.equal(game.sw.vel.y, -5);
  assert.deepEqual(samples, ['coconut']);
  game.collect('chakka');
  assert.equal(game.health, 100);
});

test('a lethal fall starts game over and clears any pending chapter card', () => {
  const { game, samples } = runFixture();
  game.health = 35;
  game.pendingCard = { chapter: 0 };
  game.fall();
  assert.equal(game.health, 0);
  assert.equal(game.dying, 1.4);
  assert.equal(game.pendingCard, null);
  assert.deepEqual(samples, ['fall']);
});

test('a banana crossing between frames hits Gedi, while a close dodge scores once', () => {
  const { game } = runFixture();
  game.sw.reset(0, 4);
  game.spawnProjectile('banana', -2, 4.6, 60, 0, 0);
  game.tickWorld(1 / 15, 0, 4);
  assert.equal(game.health, 85);
  assert.equal(game.projectiles.length, 0);

  game.invuln = 0;
  game.spawnProjectile('banana', -2, 6.2, 60, 0, 0);
  game.tickWorld(1 / 15, 0, 4);
  game.tickWorld(1 / 15, 0, 4);
  game.tickWorld(1 / 15, 0, 4);
  assert.equal(game.health, 85);
  assert.equal(game.bonus, 15);
});

test('the active roof moves under Gedi during compression and bus and auto launch differently', () => {
  const tryRoof = (make) => {
    const { game } = runFixture();
    const mesh = make();
    const road = game.level.addVehicle(mesh, -(mesh.userData.center ?? 0), -4, 'RESCUE');
    game.sw.reset(0, mesh.userData.top + 1.8);
    game.sw.vel.y = -24;
    game.physicsStep();
    const spring = game.bounceSpring;
    assert.equal(spring.roof, road);
    assert.ok(Math.abs(game.sw.pos.y - (mesh.userData.top + 1.15 * 1.45)) < 1e-8);
    const x = game.sw.pos.x;
    game.physicsStep();
    assert.ok(Math.abs(game.sw.pos.x - x + 4 / 120) < 1e-8);
    return spring;
  };
  const bus = tryRoof(makeBus);
  const auto = tryRoof(makeAuto);
  assert.ok(bus.vy > auto.vy);
  assert.ok(auto.vx > bus.vx);
});

test('the water rescue deck can catch Gedi before the lower elephant sling', () => {
  const { game } = runFixture();
  game.cfg = CHAPTERS[2];
  const boat = game.level.addBoat(0, 0, true);
  game.sw.reset(0, 1.15 * 1.45 + 1.34);
  game.sw.vel.y = -11;
  game.level.findAnjaam = () => ({});
  game.startSling = () => assert.fail('The deck is above the water sling');
  for (let i = 0; i < 4 && !game.bounceSpring; i++) game.physicsStep();
  assert.equal(game.bounceSpring.roof, boat);
  assert.equal(game.bonus, 45);
  assert.equal(boat.rescueBonus, 0);
});

test('story meter advances and the card, next biome and boss all switch at the same checkpoint', () => {
  const { game, switched } = runFixture();
  game.sw.reset(151, 7);
  game.tickWorld(0.016, 150, 7);
  assert.equal(game.snapshot().objective, '151/300 m');
  assert.ok(game.snapshot().progress > .5);
  game.onKuttappan({ type: 'caught', chapter: 0 });
  assert.equal(game.pendingCard, undefined);
  assert.equal(game.chapter.index, 0);

  game.sw.pos.x = 300;
  game.tickWorld(.016, 299, 7);
  assert.deepEqual(game.pendingCard, { chapter: 0, caught: true, victory: false });
  assert.equal(game.snapshot().objective, '0/350 m');
  assert.equal(game.kutt.index, 1);
  assert.deepEqual(switched, [CHAPTERS[1].name]);

  game.pendingCard = null;
  game.sw.pos.x = 303;
  game.tickWorld(.016, 302, 7);
  assert.equal(game.pendingCard, null);
  assert.ok(game.snapshot().progress > 0);
});

test('a missed story encounter cannot block the checkpoint and an early finale win starts Encore immediately', () => {
  const { game } = runFixture();
  game.sw.reset(301, 6);
  game.tickWorld(.016, 299, 6);
  assert.deepEqual(game.pendingCard, { chapter: 0, caught: false, victory: false });
  game.pendingCard = null;
  game.applyBiome(game.route.at(1880));
  game.sw.pos.x = game.distance = 1880;
  game.kutt.hits = 2;
  assert.equal(game.snapshot().objective, 'Nettipattam · 2/3 bonks');
  game.onKuttappan({ type: 'caught', chapter: ENCORE - 1 });
  assert.equal(game.pendingCard.victory, true);
  assert.equal(game.chapter.index, ENCORE);
  assert.equal(game.snapshot().objective, 'Leg 1 · 0/500 m');
  game.pendingCard = null;
  game.sw.pos.x = 2381;
  game.tickWorld(.016, 2380, 6);
  assert.equal(game.chapter.leg, 2);
  assert.equal(game.snapshot().objective, 'Leg 2 · 1/500 m');
  assert.equal(game.pendingCard, null);
});
