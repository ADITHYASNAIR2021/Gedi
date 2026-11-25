import assert from 'node:assert/strict';
import test from 'node:test';
import { createPreferences } from '../src/core/preferences.js';
import { NightRun, NIGHTS, SHOT_ORIGIN, chargeState } from '../src/namboothiri/game.js';
import { loadProgress, recordNight } from '../src/namboothiri/progress.js';

test('quick shots hit one mosquito, gold shots can hit two, and misses reset the streak', () => {
  const run = new NightRun(0);
  const aim = { x: SHOT_ORIGIN.x, y: 100 };
  run.bugs = [{ id: 1, x: aim.x, y: 420 }, { id: 2, x: aim.x + 25, y: 230 }];
  assert.equal(run.shoot(aim, .14).hits.length, 1);
  assert.equal(run.score, 100);
  assert.equal(run.shoot(aim, .56), null);
  run.time += .26;
  run.bugs.push({ id: 3, x: aim.x - 23, y: 295 }, { id: 4, x: aim.x + 28, y: 172 });
  const goldShot = run.shoot(aim, .56);
  assert.equal(goldShot.perfect, true);
  assert.equal(goldShot.ammoGained, 1);
  assert.deepEqual(goldShot.hits.map(hit => hit.bug.id), [3, 2]);
  assert.equal(run.score, 100 + 165 + 180);
  assert.equal(run.streak, 3);
  run.time += .26;
  assert.equal(run.shoot(aim, .9).hits.length, 0);
  assert.equal(run.streak, 0);
  assert.equal(run.bestStreak, 3);
  assert.equal(chargeState(.42).ready, false);
  assert.equal(chargeState(.43).ready, true);
  assert.equal(chargeState(.77).past, true);
});

test('mosquitoes signal a dive before a bite, and the third bite ends the run once', () => {
  const run = new NightRun(0, () => .5);
  const relevantEvents = [];
  for (let i = 0; i < 1500 && !run.outcome; i++) {
    relevantEvents.push(...run.update(.02).filter(event => event.type !== 'wave').map(event => event.type));
  }
  assert.deepEqual(relevantEvents, ['warning', 'bite', 'warning', 'bite', 'warning', 'bite', 'lost']);
  assert.equal(run.bites, 3);
  assert.equal(run.lossCause, 'bites');
  assert.equal(run.shoot({ x: 80, y: 220 }, .56), null);
  assert.deepEqual(run.update(1), []);
});

test('touch padding forgives a small aim offset without changing the shot score', () => {
  const run = new NightRun(0);
  const aim = { x: SHOT_ORIGIN.x, y: 120 };
  run.bugs = [{ id: 1, x: aim.x + 22, y: 260 }];
  assert.equal(run.shoot(aim, .2).hits.length, 0);
  run.time += .26;
  assert.equal(run.shoot(aim, .2, 6).hits.length, 1);
  assert.equal(run.score, 100);
});

test('a final shot can replenish ammo before a dry clip ends the night', () => {
  const run = new NightRun(0);
  const aim = { x: SHOT_ORIGIN.x, y: 180 };
  assert.equal(run.ammo, 11);
  run.ammo = 1;
  run.bugs = [{ id: 1, x: aim.x, y: 220, supply: true }];
  const refill = run.shoot(aim, .1);
  assert.equal(refill.ammoGained, 2);
  assert.equal(run.ammo, 2);
  assert.deepEqual(run.update(.26), []);
  assert.equal(run.shoot(aim, .1).ammoGained, 0);
  run.update(.26);
  run.shoot(aim, .1);
  assert.equal(run.ammo, 0);
  assert.equal(run.shoot(aim, .56), null);
  assert.deepEqual(run.update(.01), [{ type: 'lost' }]);
  assert.equal(run.lossCause, 'ammo');
  assert.deepEqual(run.update(.02), []);
});

function survive(run, until, perfect = true) {
  let nextShot = 0;
  while (run.time < until && !run.outcome) {
    run.update(.02);
    if (run.time < nextShot) continue;
    const targets = run.bugs.filter(bug => bug.x > 30 && bug.x < 390 && run.time - bug.born > (perfect ? .7 : .42));
    const target = targets.sort((a, b) => a.born + a.hover - b.born - b.hover)[0];
    if (target && run.shoot(target, perfect ? .56 : .1)) nextShot = run.time + (perfect ? .56 : .28);
  }
}

test('the campaign remains clearable while Monsoon rewards charged doubles', () => {
  const totals = [];
  for (const [level, night] of NIGHTS.slice(0, 3).entries()) {
    const run = new NightRun(level, () => .5);
    survive(run, night.duration);
    assert.equal(run.outcome, 'cleared');
    assert.equal(run.time, night.duration);
    assert.equal(run.bites, 0);
    assert.ok(run.ammo > 0);
    totals.push(run.hits);
  }
  assert.ok(totals[0] < totals[1] && totals[1] < totals[2]);
  const quickShots = new NightRun(2, () => .5);
  survive(quickShots, quickShots.night.duration, false);
  assert.equal(quickShots.lossCause, 'ammo');
});

test('Endless Buzz speeds up and sends larger groups as waves advance', () => {
  const run = new NightRun(3, () => .5);
  const initialAmmo = run.ammo;
  run.update(.55);
  const first = run.bugs[0];
  assert.equal(run.bugs.length, 2);
  assert.equal(first.flight, 'dart');
  const late = new NightRun(3, () => .5);
  late.time = 47.98;
  late.groups = 1;
  assert.deepEqual(late.update(.04), [{ type: 'wave', number: 5, faster: true }]);
  assert.equal(late.ammo, initialAmmo);
  assert.equal(late.bugs.length, 3);
  assert.ok(late.bugs[0].speed > first.speed);
  assert.ok(late.bugs[0].warningTime < first.warningTime);
  survive(run, 36);
  assert.equal(run.outcome, null);
  assert.equal(run.wave, 4);
});

test('night scores and unlocks persist separately from Gedi saves and shared preferences', () => {
  const previousStorage = globalThis.localStorage;
  const gedi = JSON.stringify({ best: 780, settings: { sound: false, voice: true, theri: false } });
  const storage = new Map([['gedi.save.v1', gedi]]);
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  try {
    const first = createPreferences();
    const second = createPreferences();
    assert.equal(first.settings.theri, false);
    assert.equal(first.settings.sound, false);
    first.set('theri', true);
    second.set('voice', false);
    first.refresh();
    assert.equal(first.settings.theri, true);
    assert.equal(first.settings.voice, false);
    const progress = loadProgress();
    const win = recordNight({ level: 0, score: 1000, outcome: 'cleared' }, progress);
    assert.equal(win.best, true);
    recordNight({ level: 1, score: 600, outcome: 'lost' }, win.progress);
    assert.deepEqual(loadProgress(), { unlocked: 1, bests: [1000, 600, 0, 0] });
    assert.equal(storage.get('gedi.save.v1'), gedi);
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});
