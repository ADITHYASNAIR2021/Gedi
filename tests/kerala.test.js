import assert from 'node:assert/strict';
import test from 'node:test';
import { AANAS, aanaAt } from '../src/game/aanas.js';
import { GameAudio, recordedBeat } from '../src/core/audio.js';
import { makeVallam, animateVallam } from '../src/entities/vallam.js';

function audioFixture() {
  function parameter() {
    return {
      setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {},
      setTargetAtTime(target) { this.target = target; },
    };
  }
  const audio = new GameAudio({ music: true, sound: true, voice: true, theri: true });
  audio.ctx = {
    currentTime: 10,
    createGain: () => ({ gain: parameter(), connect() {} }),
    createBufferSource: () => ({
      connect(output) { return output; },
      start(...args) { this.started = args; },
      stop(time) { this.stopped = time; },
    }),
  };
  for (const name of ['bed', 'sfx', 'ambience', 'soundVolume', 'musicVolume']) audio[name] = audio.ctx.createGain();
  Object.assign(audio.clips, { aiyooo: { duration: 1.135 }, myre: { duration: .749 }, onam: { duration: 7 } });
  audio.musicOn = true;
  return audio;
}

test('recorded Thaalam stays aligned across the loop cut', () => {
  assert.ok(recordedBeat(5.704).offset < 1e-9);
  assert.ok(recordedBeat(22.548 + .032).offset < 1e-9);
  assert.ok(recordedBeat(22.548 - .01).offset < .045);
  assert.ok(recordedBeat(22.548 + .22).phase > 0);
});

test('an impact ducks the bed, takes priority over a taunt, and resumes Onam at the interrupted offset', () => {
  const audio = audioFixture();
  assert.equal(audio.playRadio(), true);
  const radio = audio.radio.source;
  audio.ctx.currentTime = 12;
  assert.equal(audio.sample('myre'), true);
  const taunt = audio.reaction;
  assert.ok(radio.stopped < taunt.started[0]);
  assert.equal(audio.bed.gain.target, .09);
  assert.equal(audio.sfx.gain.target, .30);
  assert.equal(audio.radio.source, null);

  audio.ctx.currentTime = 12.2;
  audio.sample('aiyooo');
  const impact = audio.reaction;
  assert.ok(taunt.stopped < impact.started[0]);
  taunt.onended();
  assert.equal(audio.reaction, impact);
  assert.equal(audio.radio.source, null);
  audio.ctx.currentTime = 13.5;
  impact.onended();
  assert.ok(Math.abs(audio.radio.source.started[1] - 2.028) < 1e-9);
  audio.radio.source.onended();
  assert.equal(audio.radioActive, false);
  assert.equal(audio.bed.gain.target, 1);
});

test('music and Theri settings suppress their respective audio requests', () => {
  const audio = audioFixture();
  audio.settings.music = false;
  audio.settings.theri = false;
  assert.equal(audio.playRadio(), false);
  assert.equal(audio.sample('myre'), false);
  assert.equal(audio.sample('aiyooo'), true);
  audio.stopMusic();
  assert.equal(audio.bed.gain.target, 0);
  assert.ok(audio.reaction);
});

test('all chapters have distinct first-grab album encounters and older saves retain progress', async () => {
  const placed = new Set();
  for (const aana of AANAS) {
    assert.notEqual(aanaAt(aana.chapter, aana.at - 1, placed)?.id, aana.id);
    assert.equal(aanaAt(aana.chapter, aana.at, placed)?.id, aana.id);
    placed.add(aana.id);
    assert.notEqual(aanaAt(aana.chapter, aana.at, placed)?.id, aana.id);
  }
  assert.equal(placed.size, 12);
  const realStorage = globalThis.localStorage;
  let data = JSON.stringify({ best: 760, settings: { theri: false } });
  globalThis.localStorage = { getItem: () => data, setItem: (_, value) => { data = value; } };
  try {
    const { save } = await import('../src/core/storage.js?legacy-album');
    assert.equal(save.data.best, 760);
    assert.equal(save.data.settings.theri, false);
    assert.equal(save.discoverAana('kesavan'), true);
    assert.equal(save.discoverAana('kesavan'), false);
    assert.equal(save.discoverAana('not-an-elephant'), false);
    const reloaded = await import('../src/core/storage.js?reloaded-album');
    assert.deepEqual(reloaded.save.data.aanas, { kesavan: true });
    assert.equal(reloaded.save.data.best, 760);
  } finally {
    if (realStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = realStorage;
  }
});

test('the vallam crew animates while the rescue deck stays aligned', () => {
  const boat = makeVallam(true);
  const { crew, top, half } = boat.userData;
  const deck = boat.children[1];
  assert.equal(crew.oars.count, 20);
  const initial = Array.from(crew.oars.instanceMatrix.array);
  animateVallam(boat, .21);
  assert.notDeepEqual(Array.from(crew.oars.instanceMatrix.array), initial);
  assert.ok(Math.abs(top - (deck.position.y + deck.scale.y / 2)) < 1e-9);
  assert.equal(half, deck.scale.x / 2);
});
