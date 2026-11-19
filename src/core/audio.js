// Chenda melam, procedural effects, and Gedi's recorded reactions.

const CLIPS = {
  aiyooo: { url: new URL('../../Audio/aiyooooo.m4a', import.meta.url), gain: 1.12, cooldown: 1.4, impact: true },
  myre: { url: new URL('../../Audio/Myre.m4a', import.meta.url), gain: 1.45, cooldown: 10, spicy: true },
  onam: { url: new URL('../../Audio/mrkolayali-sayip-onam.mp3', import.meta.url), gain: 1 },
  melam: { url: '/assets/audio/chendamelam-loop.mp3', gain: 0.82 },
  vembanadu: { url: new URL('../../Audio/vembanadu.mp3', import.meta.url), title: 'VEMBANADU', gain: 1.22, loop: [.30, 15.60] },
  kasavinte: { url: new URL("../../Audio/Kasavinte'.mp3", import.meta.url), title: 'KASAVINTE', gain: 1.35, loop: [.14, 17.34] },
  jailer: { url: new URL('../../Audio/Jailer.mp3', import.meta.url), title: 'JAILER', gain: .99, loop: [0, 28.96] },
  manchatti: { url: new URL('../../Audio/Manchatti.m4a', import.meta.url), gain: 2.65, cooldown: 2, spicy: true, theri: [0, 1.4] },
  punda: { url: new URL('../../Audio/Punda mone.m4a', import.meta.url), gain: 1.7, cooldown: 2, spicy: true, theri: [0, .69] },
  thayoli: { url: new URL('../../Audio/Thayoli.m4a', import.meta.url), gain: 2.5, cooldown: 12, spicy: true, theri: [1.87, .79] },
  ullas: { url: new URL('../../Audio/Thayoli2- ullas.m4a', import.meta.url), gain: 2.55, cooldown: 12, spicy: true, offset: .58, theri: [.58, 1.16] },
};

const IMPACT_LINES = { banana: 'manchatti', coconut: 'punda' };
const RANDOM_LINES = ['thayoli', 'ullas'];
const THERI_LINES = ['myre', 'manchatti', 'punda', 'thayoli', 'ullas'];

// Blend across the wrap without changing the clip duration or keeping the leading silence.
function softenLoop(buffer, [start, end]) {
  const first = Math.round(start * buffer.sampleRate);
  const last = Math.round(end * buffer.sampleRate);
  const width = Math.min(Math.round(.054 * buffer.sampleRate), buffer.length - last);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < width; i++) {
      const weight = i / width;
      data[first + i] = data[last + i] * (1 - weight) + data[first + i] * weight;
    }
  }
}

const MELAM_LENGTH = 22.548;
// Accented transients in the prepared recording, measured from the loop cut.
const MELAM_BEATS = [
  .032, .651, 1.279, 1.918, 2.556, 3.185, 3.813, 4.452, 5.071,
  5.704, 6.333, 6.951, 7.590, 8.218, 8.842, 9.471, 10.104, 10.718,
  11.341, 11.970, 12.599, 13.217, 13.836, 14.464, 15.098, 15.716, 16.340,
  16.964, 17.602, 18.216, 18.834, 19.458, 20.096, 20.710, 21.324, 21.947,
];

export function recordedBeat(elapsed, length = MELAM_LENGTH) {
  const t = ((elapsed % length) + length) % length;
  const i = MELAM_BEATS.findIndex(beat => beat > t);
  const previous = i > 0 ? MELAM_BEATS[i - 1] : MELAM_BEATS[MELAM_BEATS.length - 1] - (i < 0 ? 0 : length);
  const next = i < 0 ? MELAM_BEATS[0] + length : MELAM_BEATS[i];
  return { offset: Math.min(t - previous, next - t), phase: (t - previous) / (next - previous) };
}

const STEPS = 16;
const CHENDA = [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1];
const ACCENT = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const THOM = [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0];
const CYMBAL = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
// nadaswaram line in Mohanam (S R2 G3 P D2), eight notes per bar, -1 = rest
const MOHANAM = [0, 2, 4, 7, 9];
const MELODY = [
  [0, 1, 2, 4, 2, -1, 1, 0],
  [2, 4, 5, 4, 2, 1, 2, -1],
  [4, 5, 6, 5, 4, 2, 1, 0],
  [0, -1, 2, 1, 0, -1, -1, -1],
];

export class GameAudio {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.bpm = 108;
    this.step = 0;
    this.bar = 0;
    this.nextTime = 0;
    this.beats = [];
    this.musicOn = false;
    this.lastSay = 0;
    this.festival = 0;
    this.clips = {};
    this.lastSample = {};
    this.ambienceProfile = [600, 0.12];
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);
    this.music = ctx.createGain();
    this.recording = ctx.createGain();
    this.bed = ctx.createGain();
    this.bed.gain.value = 0;
    this.musicVolume = ctx.createGain();
    this.soundVolume = ctx.createGain();
    this.sfx = ctx.createGain();
    this.ambience = ctx.createGain();
    this.ambience.gain.value = 0;
    this.music.connect(this.bed);
    this.recording.connect(this.bed);
    this.bed.connect(this.musicVolume).connect(this.master);
    this.sfx.connect(this.soundVolume).connect(this.master);
    this.ambience.connect(this.soundVolume);
    this.applySettings();
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.timer = setInterval(() => this.schedule(), 25);
    for (const [name, clip] of Object.entries(CLIPS)) {
      fetch(clip.url)
        .then((response) => response.ok ? response.arrayBuffer() : Promise.reject())
        .then((bytes) => ctx.decodeAudioData(bytes))
        .then((buffer) => {
          if (clip.loop) softenLoop(buffer, clip.loop);
          this.clips[name] = buffer;
          if (name === 'melam' && this.musicOn) this.startMelam();
          if (name === this.chapterMusic && this.musicOn) this.syncChapterMusic();
          if (clip.theri) this.continueTheri();
        })
        .catch(() => {});
    }
  }

  applySettings() {
    if (!this.ctx) return;
    this.musicVolume.gain.value = this.settings.music ? 0.55 : 0;
    this.soundVolume.gain.value = this.settings.sound ? 1 : 0;
    if (!this.settings.theri || !this.settings.sound || !this.settings.voice) this.setTheriMode(false);
    if (!this.settings.sound || !this.settings.voice) this.clearReaction();
  }

  setTempo(bpm) { this.bpm = bpm; }
  setFestival(level) { this.festival = Math.max(0, Math.min(3, level)); }
  startMusic() {
    this.stopMusic();
    this.musicOn = true;
    this.beats = [];
    this.step = this.bar = 0;
    this.lastSample = {};
    if (!this.ctx) return;
    const t = this.now;
    this.music.gain.setValueAtTime(1, t);
    this.nextTime = t + 0.05;
    this.startMelam();
    this.syncChapterMusic();
    this.startAmbience();
    this.mix(0.06);
  }

  stopMusic() {
    this.musicOn = false;
    if (!this.ctx) return;
    const t = this.now;
    this.radio?.source?.stop(t);
    this.radio = null;
    this.sceneTrack?.source.stop(t);
    this.sceneTrack = null;
    this.melam?.stop(t);
    this.melam = null;
    this.air?.stop(t);
    this.air = null;
    this.airFilter = null;
    this.setTheriMode(false);
    this.mix(0.04);
  }

  startMelam() {
    if (this.melam || !this.clips.melam) return;
    const t = this.now;
    const source = this.ctx.createBufferSource();
    source.buffer = this.clips.melam;
    source.loop = true;
    source.loopEnd = Math.min(MELAM_LENGTH, source.buffer.duration);
    this.melamStart = t + 0.045;
    this.melam = source;
    source.connect(this.recording);
    this.recording.gain.cancelScheduledValues(t);
    this.recording.gain.setValueAtTime(0, t);
    this.recording.gain.linearRampToValueAtTime(this.sceneTrack ? 0 : CLIPS.melam.gain, t + 0.2);
    this.fade(this.music.gain, 0, 0.035);
    source.start(this.melamStart);
  }

  setChapterMusic(name) {
    this.chapterMusic = name;
    if (this.ctx && this.musicOn) this.syncChapterMusic();
  }

  syncChapterMusic() {
    const name = this.clips[this.chapterMusic] ? this.chapterMusic : null;
    const previous = this.sceneTrack;
    if ((previous?.name ?? null) === name) return;
    const t = this.now;
    if (previous) {
      this.fade(previous.gain.gain, 0, .07);
      previous.source.stop(t + .34);
    }
    this.sceneTrack = null;
    if (name) {
      const clip = CLIPS[name];
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = this.clips[name];
      source.loop = true;
      source.loopStart = clip.loop[0];
      source.loopEnd = Math.min(clip.loop[1], source.buffer.duration);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(clip.gain, t + .34);
      source.connect(gain).connect(this.bed);
      source.start(t, source.loopStart);
      this.sceneTrack = { name, source, gain };
    }
    this.fade(this.recording.gain, name ? 0 : CLIPS.melam.gain, .09);
    this.fade(this.music.gain, name || this.melam ? 0 : 1, .09);
  }

  get chapterMusicTitle() { return this.sceneTrack && this.settings.music ? CLIPS[this.sceneTrack.name].title : null; }

  setAmbience(cfg) {
    this.ambienceProfile = cfg.water ? [300, .16] : cfg.props.includes('waterfall') ? [850, .26]
      : cfg.props.includes('teahill') ? [420, .095] : [630, .10];
    if (this.airFilter) {
      this.fade(this.airFilter.frequency, this.ambienceProfile[0], 0.2);
      this.mix(0.15);
    }
  }

  startAmbience() {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = this.ambienceProfile[0];
    source.connect(filter).connect(this.ambience);
    this.air = source;
    this.airFilter = filter;
    source.start();
  }

  fade(parameter, target, time) {
    parameter.cancelScheduledValues(this.now);
    parameter.setTargetAtTime(target, this.now, time);
  }

  mix(time) {
    const voice = !!(this.reaction || this.speech);
    const bed = !this.musicOn ? 0 : voice ? (this.sceneTrack ? .045 : .09) : this.radio ? .075 : 1;
    this.fade(this.bed.gain, bed, time);
    this.fade(this.sfx.gain, voice ? 0.30 : 1, time);
    this.fade(this.ambience.gain, this.musicOn ? this.ambienceProfile[1] * (voice ? 0.1 : 1) : 0, time);
  }

  impact(hazard) {
    const line = IMPACT_LINES[hazard];
    return (line && this.sample(line, 'impact')) || this.sample('aiyooo');
  }

  randomQuip() {
    if (this.theriMode || this.reaction || this.speech || this.radio) return false;
    const index = this.lastQuip === 0 ? 1 : this.lastQuip === 1 ? 0 : Math.floor(Math.random() * RANDOM_LINES.length);
    this.lastQuip = index;
    return this.sample(RANDOM_LINES[index]);
  }

  setTheriMode(active) {
    const enabled = active && this.settings.theri && this.settings.sound && this.settings.voice;
    if (enabled === !!this.theriMode) return;
    this.theriMode = enabled;
    if (enabled) {
      this.theriIndex = 0;
      if (this.reactionRole === 'quip') this.clearReaction();
      this.continueTheri();
    } else if (this.reactionRole === 'theri') {
      this.clearReaction();
    }
  }

  continueTheri() {
    if (!this.ctx || !this.theriMode || this.reaction) return;
    for (let i = 0; i < THERI_LINES.length; i++) {
      const name = THERI_LINES[this.theriIndex];
      this.theriIndex = (this.theriIndex + 1) % THERI_LINES.length;
      if (this.sample(name, 'theri')) return;
    }
  }

  sample(name, role = CLIPS[name]?.impact ? 'impact' : 'quip') {
    const clip = CLIPS[name];
    const buffer = this.clips[name];
    if (!buffer || !this.settings.sound || !this.settings.voice || (clip.spicy && !this.settings.theri)) return false;
    const t = this.now;
    if (role !== 'theri' && t - (this.lastSample[name] ?? -Infinity) < clip.cooldown) return role !== 'impact';
    if (this.reaction && role !== 'impact') return true;
    this.reaction?.stop(t + 0.012);
    this.cancelSpeech();
    this.pauseRadio();
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    gain.gain.value = clip.gain;
    source.buffer = buffer;
    source.connect(gain).connect(this.soundVolume);
    source.onended = () => {
      if (this.reaction !== source) return;
      this.reaction = null;
      this.reactionRole = null;
      this.continueTheri();
      if (this.reaction) return;
      this.resumeRadio();
      this.mix(0.14);
    };
    this.reaction = source;
    this.reactionRole = role;
    if (role !== 'theri') this.lastSample[name] = t;
    this.mix(0.015);
    const [offset, duration] = (role === 'theri' && clip.theri) || [clip.offset || 0, undefined];
    if (duration) source.start(t + .05, offset, Math.min(duration, buffer.duration - offset));
    else source.start(t + .05, offset);
    return true;
  }

  clearReaction() {
    this.reaction?.stop();
    this.reaction = null;
    this.reactionRole = null;
    this.cancelSpeech();
    if (this.ctx) {
      this.continueTheri();
      if (this.reaction) return;
      this.resumeRadio();
      this.mix(0.1);
    }
  }

  cancelSpeech() {
    if (!this.speech) return;
    this.speech = null;
    speechSynthesis.cancel();
  }

  get radioActive() { return !!this.radio; }

  playRadio() {
    if (!this.clips.onam || !this.musicOn || !this.settings.music || this.radio || this.reaction || this.speech || this.theriMode) return false;
    this.radio = { offset: 0, source: null };
    this.resumeRadio();
    this.mix(0.09);
    return true;
  }

  pauseRadio() {
    const radio = this.radio;
    if (!radio?.source) return;
    const stopAt = this.now + 0.028;
    this.fade(radio.fade.gain, 0, 0.007);
    radio.source.stop(stopAt);
    radio.offset = Math.min(this.clips.onam.duration, radio.offset + Math.max(0, stopAt - radio.startedAt));
    radio.source = null;
  }

  resumeRadio() {
    const radio = this.radio;
    if (!radio || radio.source || this.reaction || this.speech) return;
    const t = this.now;
    const buffer = this.clips.onam;
    const left = buffer.duration - radio.offset;
    if (left <= 0.035) { this.radio = null; return; }
    const end = t + left;
    const source = this.ctx.createBufferSource();
    const fade = this.ctx.createGain();
    source.buffer = buffer;
    source.connect(fade).connect(this.musicVolume);
    fade.gain.setValueAtTime(0, t);
    fade.gain.linearRampToValueAtTime(CLIPS.onam.gain, t + Math.min(0.27, left * 0.35));
    fade.gain.setValueAtTime(CLIPS.onam.gain, end - Math.min(0.40, left * 0.35));
    fade.gain.linearRampToValueAtTime(0, end);
    Object.assign(radio, { source, fade, startedAt: t });
    source.onended = () => {
      if (this.radio?.source !== source) return;
      this.radio = null;
      this.mix(0.15);
    };
    source.start(t, radio.offset);
  }
  pause() {
    if (this.speech) this.clearReaction();
    this.ctx?.suspend();
  }
  resume() { this.ctx?.resume(); }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  // Seconds between now and the nearest chenda beat (quarter note).
  beatOffset() {
    if (!this.ctx || !this.musicOn) return Infinity;
    const t = this.ctx.currentTime;
    if (this.melam && t >= this.melamStart) return recordedBeat(t - this.melamStart, this.melam.loopEnd).offset;
    let best = Infinity;
    for (const b of this.beats) best = Math.min(best, Math.abs(b - t));
    return best;
  }

  // 0..1 progress since the last beat, for the HUD drum pulse.
  beatPhase() {
    if (!this.ctx || !this.musicOn) return 1;
    const t = this.ctx.currentTime;
    if (this.melam && t >= this.melamStart) return recordedBeat(t - this.melamStart, this.melam.loopEnd).phase;
    const past = this.beats.filter((b) => b <= t);
    if (!past.length) return 1;
    return Math.min(1, (t - past[past.length - 1]) / (60 / this.bpm));
  }

  schedule() {
    if (!this.ctx || !this.musicOn || this.melam) return;
    const ahead = this.ctx.currentTime + 0.12;
    const stepDur = 60 / this.bpm / 4;
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.02;
    while (this.nextTime < ahead) {
      const s = this.step;
      const t = this.nextTime;
      if (CHENDA[s]) this.chenda(t, ACCENT[s]);
      if (THOM[s]) this.thom(t);
      if (CYMBAL[s]) this.cymbal(t);
      if (this.festival >= 1 && s === 14) this.chenda(t, false);
      if (this.festival >= 2 && [3, 7, 11, 15].includes(s)) this.cymbal(t);
      if (this.festival >= 3 && s === 0) this.kombu(t);
      if (s % 4 === 0) {
        this.beats.push(t);
        if (this.beats.length > 8) this.beats.shift();
      }
      if (s === 0 && this.bar % 4 === 3) this.kombu(t);
      if (s % 2 === 0) this.melody(t, s / 2);
      this.nextTime += stepDur;
      this.step = (s + 1) % STEPS;
      if (this.step === 0) this.bar++;
    }
  }

  // ---------- building blocks ----------
  env(gainNode, t, peak, attack, decay) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  noiseHit(t, { type = 'bandpass', freq = 1000, q = 1, peak = 0.3, attack = 0.002, decay = 0.1, out = this.sfx, rate = 1 }) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = rate;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    this.env(g, t, peak, attack, decay);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 1.5);
    src.stop(t + attack + decay + 0.05);
    return f;
  }

  tone(t, { type = 'sine', from = 440, to = from, dur = 0.2, peak = 0.2, attack = 0.005, out = this.sfx }) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = this.ctx.createGain();
    this.env(g, t, peak, attack, dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
    return o;
  }

  // ---------- music voices ----------
  chenda(t, accent) {
    this.noiseHit(t, { freq: 1700, q: 2, peak: accent ? 0.32 : 0.16, decay: 0.07, out: this.music });
    this.tone(t, { from: 520, to: 300, dur: 0.04, peak: accent ? 0.12 : 0.05, out: this.music });
  }

  thom(t) {
    this.tone(t, { from: 150, to: 52, dur: 0.28, peak: 0.55, out: this.music });
  }

  cymbal(t) {
    this.noiseHit(t, { type: 'highpass', freq: 6500, q: 0.7, peak: 0.09, decay: 0.32, out: this.music });
    this.tone(t, { type: 'square', from: 3520, to: 3400, dur: 0.18, peak: 0.015, out: this.music });
  }

  kombu(t) {
    const notes = [[233, 311], [262, 349], [233, 392]][this.bar % 3];
    notes.forEach((f, i) => {
      const s = t + i * 0.38;
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * 0.94, s);
      o.frequency.linearRampToValueAtTime(f, s + 0.08);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.06, s + 0.05);
      g.gain.setValueAtTime(0.06, s + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.5);
      o.connect(lp).connect(g).connect(this.music);
      o.start(s);
      o.stop(s + 0.55);
    });
  }

  melody(t, i) {
    const deg = MELODY[(this.bar >> 1) % MELODY.length][i];
    if (deg < 0) return;
    const f = 293.66 * Math.pow(2, MOHANAM[deg % 5] / 12) * (deg >= 5 ? 2 : 1);
    const dur = (60 / this.bpm / 2) * 0.92;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    lp.Q.value = 3;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.03);
    g.gain.setValueAtTime(0.05, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const type of ['sawtooth', 'square']) {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f * 0.94, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    lp.connect(g).connect(this.music);
  }

  // ---------- sound effects ----------
  play(name, arg) {
    if (!this.ctx || !this.settings.sound) return;
    const fn = this[`sfx_${name}`];
    if (fn) fn.call(this, this.ctx.currentTime + 0.005, arg);
  }

  sfx_trumpet(t, pitch = 1) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.08);
    g.gain.setValueAtTime(0.22, t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(700, t);
    bp.frequency.linearRampToValueAtTime(1900, t + 0.35);
    bp.frequency.linearRampToValueAtTime(1100, t + 1);
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 9;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 30 * pitch;
    lfo.connect(lfoGain);
    [0, 7].forEach((detune) => {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.detune.value = detune;
      o.frequency.setValueAtTime(260 * pitch, t);
      o.frequency.exponentialRampToValueAtTime(760 * pitch, t + 0.18);
      o.frequency.exponentialRampToValueAtTime(560 * pitch, t + 0.9);
      lfoGain.connect(o.frequency);
      o.connect(bp);
      o.start(t);
      o.stop(t + 1.05);
    });
    lfo.start(t);
    lfo.stop(t + 1.05);
    bp.connect(g).connect(this.sfx);
    this.noiseHit(t, { freq: 1200, q: 0.8, peak: 0.06, attack: 0.05, decay: 0.6 });
  }

  sfx_grab(t) {
    this.tone(t, { type: 'triangle', from: 300, to: 900, dur: 0.09, peak: 0.25 });
    this.noiseHit(t, { freq: 3000, q: 3, peak: 0.08, decay: 0.05 });
  }

  sfx_whoosh(t, power = 1) {
    const f = this.noiseHit(t, { freq: 400, q: 1.5, peak: 0.18 * power, attack: 0.04, decay: 0.3 });
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.3);
  }

  sfx_collect(t, n = 0) {
    const base = 1046 * Math.pow(2, (n % 5) / 12);
    this.tone(t, { type: 'square', from: base, dur: 0.06, peak: 0.07 });
    this.tone(t + 0.06, { type: 'square', from: base * 1.5, dur: 0.12, peak: 0.07 });
  }

  sfx_perfect(t) {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(t + i * 0.05, { type: 'triangle', from: f, dur: 0.15, peak: 0.16 }));
  }

  sfx_teaCombo(t) {
    [587, 740, 880, 1174].forEach((from, i) => this.tone(t + i * .09, { type: 'sine', from, dur: .22, peak: .1 }));
  }

  sfx_festival(t, level = 1) {
    for (let i = 0; i < 3 + level; i++) this.noiseHit(t + i * .085, { freq: 1600 + i * 180, peak: .13, decay: .07 });
    this.tone(t + .3, { type: 'triangle', from: 392, to: 784, dur: .38, peak: .12 });
  }

  sfx_beat(t) {
    this.tone(t, { from: 180, to: 60, dur: 0.2, peak: 0.5 });
    this.noiseHit(t, { freq: 2200, q: 2, peak: 0.25, decay: 0.12 });
  }

  sfx_bonk(t) {
    this.tone(t, { type: 'square', from: 420, to: 90, dur: 0.22, peak: 0.2 });
    this.tone(t + 0.1, { type: 'sine', from: 1800, to: 1700, dur: 0.3, peak: 0.05 });
  }

  sfx_thud(t) {
    this.tone(t, { from: 120, to: 35, dur: 0.35, peak: 0.7 });
    this.noiseHit(t, { type: 'lowpass', freq: 500, q: 0.5, peak: 0.4, decay: 0.3 });
  }

  sfx_splash(t) {
    const f = this.noiseHit(t, { type: 'lowpass', freq: 3000, q: 0.5, peak: 0.45, attack: 0.01, decay: 0.6 });
    f.frequency.exponentialRampToValueAtTime(300, t + 0.6);
  }

  sfx_bounce(t) {
    this.tone(t, { type: 'sine', from: 180, to: 720, dur: 0.18, peak: 0.35 });
  }

  sfx_horn(t, pitch = 1.4) {
    this.tone(t, { type: 'triangle', from: 218 * pitch, to: 208 * pitch, dur: 0.17, peak: 0.16 });
    this.tone(t, { type: 'triangle', from: 324 * pitch, to: 310 * pitch, dur: 0.14, peak: 0.085 });
    this.tone(t + 0.19, { type: 'triangle', from: 241 * pitch, to: 218 * pitch, dur: 0.14, peak: 0.12 });
  }

  sfx_toss(t) {
    this.noiseHit(t, { freq: 2100, q: 1.5, peak: 0.11, decay: 0.18 });
  }

  sfx_sneeze(t) {
    this.tone(t, { type: 'sawtooth', from: 300, to: 500, dur: 0.25, peak: 0.06 });
    const f = this.noiseHit(t + 0.3, { freq: 2500, q: 0.6, peak: 0.5, attack: 0.01, decay: 0.4 });
    f.frequency.exponentialRampToValueAtTime(700, t + 0.7);
  }

  sfx_firework(t) {
    this.tone(t, { from: 300, to: 1600, dur: 0.5, peak: 0.04 });
    this.noiseHit(t + 0.5, { type: 'lowpass', freq: 1200, q: 0.4, peak: 0.5, decay: 0.5 });
    for (let i = 0; i < 6; i++) {
      this.noiseHit(t + 0.6 + Math.random() * 0.6, { freq: 4000, q: 4, peak: 0.08, decay: 0.03 });
    }
  }

  sfx_fanfare(t) {
    [392, 523, 659, 784, 659, 784, 1046].forEach((f, i) =>
      this.tone(t + i * 0.11, { type: 'sawtooth', from: f, dur: i === 6 ? 0.5 : 0.1, peak: 0.08 }),
    );
  }

  sfx_lose(t) {
    [392, 330, 262, 196].forEach((f, i) => this.tone(t + i * 0.18, { type: 'triangle', from: f, to: f * 0.97, dur: 0.2, peak: 0.15 }));
  }

  // anjaamkaal: a big rubbery twang
  sfx_twang(t) {
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.5);
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 22;
    const lg = this.ctx.createGain();
    lg.gain.value = 45;
    lfo.connect(lg).connect(o.frequency);
    const g = this.ctx.createGain();
    this.env(g, t, 0.45, 0.01, 0.6);
    o.connect(g).connect(this.sfx);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.7);
    lfo.stop(t + 0.7);
  }

  sfx_rage(t) {
    [196, 247, 294, 392, 494, 587].forEach((f, i) =>
      this.tone(t + i * 0.06, { type: 'sawtooth', from: f, to: f * 1.02, dur: i === 5 ? 0.6 : 0.09, peak: 0.12 }),
    );
    this.noiseHit(t, { type: 'lowpass', freq: 900, q: 0.5, peak: 0.35, attack: 0.02, decay: 0.7 });
  }

  sfx_monkey(t) {
    [0, 0.09, 0.18, 0.3].forEach((d, i) =>
      this.tone(t + d, { type: 'square', from: 700 + i * 120, to: 1100 + i * 150, dur: 0.07, peak: 0.05 }),
    );
  }

  say(text, force = false) {
    if (!this.settings.voice || !this.settings.sound || this.reaction || this.radio || !('speechSynthesis' in window)) return;
    const now = performance.now();
    if (!force && (this.speech || now - this.lastSay < 2500)) return;
    this.lastSay = now;
    this.cancelSpeech();
    const u = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    u.voice = voices.find((v) => /en-IN/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang)) || null;
    u.rate = 1.15;
    u.pitch = 1.25;
    u.volume = 0.9;
    this.speech = u;
    u.onend = u.onerror = () => {
      if (this.speech !== u) return;
      this.speech = null;
      if (this.ctx) {
        this.resumeRadio();
        this.mix(0.13);
      }
    };
    if (this.ctx) this.mix(0.012);
    speechSynthesis.speak(u);
  }
}
