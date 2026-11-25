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
    relevantEvents.push(...run.update(.02).map(event => event.type));
  }
  assert.deepEqual(relevantEvents, ['warning', 'bite', 'warning', 'bite', 'warning', 'bite', 'lost']);
  assert.equal(run.bites, 3);
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

function survive(run, until) {
  while (run.time < until && !run.outcome) {
    run.update(.02);
    const target = run.bugs.find(bug => bug.x > 30 && bug.x < 390 && run.time - bug.born > .65);
    if (target) run.shoot(target, .56);
  }
}

test('all three nights clear at their finish times and Endless Buzz keeps running', () => {
  for (const [level, night] of NIGHTS.entries()) {
    const run = new NightRun(level, () => .5);
    survive(run, night.duration === Infinity ? 95 : night.duration);
    if (level === 3) {
      assert.equal(run.outcome, null);
      assert.ok(run.time >= 95);
      assert.ok(run.hits >= 35);
    } else {
      assert.equal(run.outcome, 'cleared');
      assert.equal(run.time, night.duration);
      assert.ok(run.hits >= 7);
    }
    assert.equal(run.bites, 0);
  }
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
