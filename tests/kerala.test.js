import assert from 'node:assert/strict';
import test from 'node:test';
import { AANAS, aanaAt } from '../src/game/aanas.js';
import { GameAudio, recordedBeat } from '../src/core/audio.js';
import { makeVallam, animateVallam } from '../src/entities/vallam.js';
import { CHAPTERS } from '../src/game/story.js';

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
  for (const name of ['bed', 'recording', 'music', 'sfx', 'ambience', 'soundVolume', 'musicVolume']) audio[name] = audio.ctx.createGain();
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

test('chapter changes loop their assigned tracks and fade the outgoing bed', () => {
  const audio = audioFixture();
  const durations = [15.86, 17.48, 30.93];
  const ids = CHAPTERS.slice(2).map(chapter => chapter.music);
  assert.deepEqual(ids, ['vembanadu', 'kasavinte', 'jailer']);

  ids.forEach((name, i) => {
    audio.clips[name] = { duration: durations[i] };
    const previous = audio.sceneTrack;
    audio.setChapterMusic(name);
    assert.equal(audio.sceneTrack.name, name);
    assert.equal(audio.sceneTrack.source.loop, true);
    assert.equal(audio.sceneTrack.source.started[1], audio.sceneTrack.source.loopStart);
    assert.ok(audio.sceneTrack.source.loopEnd <= durations[i]);
    assert.equal(audio.recording.gain.target, 0);
    if (previous) assert.ok(previous.source.stopped > audio.ctx.currentTime);
  });
  audio.setChapterMusic(CHAPTERS[0].music);
  assert.equal(audio.sceneTrack, null);
  assert.ok(audio.recording.gain.target > 0);
});

test('hazard voices use their assigned recordings, with Aiyooo in clean mode', () => {
  const audio = audioFixture();
  audio.clips.manchatti = { duration: 2.2 };
  audio.clips.punda = { duration: .697 };
  assert.equal(audio.impact('banana'), true);
  assert.equal(audio.reaction.buffer, audio.clips.manchatti);
  const banana = audio.reaction;
  audio.ctx.currentTime++;
  assert.equal(audio.impact('coconut'), true);
  assert.ok(banana.stopped < audio.reaction.started[0]);
  assert.equal(audio.reaction.buffer, audio.clips.punda);
  audio.settings.theri = false;
  assert.equal(audio.impact('banana'), true);
  assert.equal(audio.reaction.buffer, audio.clips.aiyooo);
});

test('Theri follows the current impact, cycles all lines without overlap and stops at exit', () => {
  const audio = audioFixture();
  Object.assign(audio.clips, { manchatti: { duration: 2.2 }, punda: { duration: .697 },
    thayoli: { duration: 3.58 }, ullas: { duration: 3.86 } });
  audio.impact('banana');
  const hitVoice = audio.reaction;
  audio.setTheriMode(true);
  assert.equal(audio.reaction, hitVoice);
  const played = [];
  for (let i = 0; i < 6; i++) {
    audio.ctx.currentTime += 2.4;
    audio.reaction.onended();
    assert.equal(audio.reactionRole, 'theri');
    played.push(Object.keys(audio.clips).find(name => audio.clips[name] === audio.reaction.buffer));
  }
  assert.deepEqual(played, ['myre', 'manchatti', 'punda', 'thayoli', 'ullas', 'myre']);
  const last = audio.reaction;
  audio.setTheriMode(false);
  last.onended();
  assert.equal(audio.reaction, null);
  assert.equal(audio.bed.gain.target, 1);
});

test('random clips alternate on quiet stretches and yield to radio and voice playback', () => {
  const audio = audioFixture();
  audio.clips.thayoli = { duration: 3.58 };
  audio.clips.ullas = { duration: 3.86 };
  assert.equal(audio.playRadio(), true);
  assert.equal(audio.randomQuip(), false);
  audio.radio.source.onended();
  assert.equal(audio.randomQuip(), true);
  const first = audio.reaction.buffer;
  assert.equal(audio.randomQuip(), false);
  audio.reaction.onended();
  assert.equal(audio.randomQuip(), true);
  assert.notEqual(audio.reaction.buffer, first);
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
