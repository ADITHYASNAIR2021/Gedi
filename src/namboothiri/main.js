import { createPreferences } from '../core/preferences.js';
import { HEIGHT, NIGHTS, SHOT_ORIGIN, WIDTH, NightRun, chargeState } from './game.js';
import { loadProgress, recordNight } from './progress.js';
import { createRoomPainter } from './scene.js';
import { createSound } from './sound.js';

const $ = id => document.getElementById(id);
const canvas = $('room');
const ctx = canvas.getContext('2d');
const TOUCH_AIM_PADDING = 6;

if (ctx) boot();
else {
  $('menu-panel').hidden = true;
  $('error-panel').hidden = false;
}

function boot() {
  const preferences = createPreferences();
  const settings = preferences.settings;
  const sound = createSound(settings);
  const paint = createRoomPainter(() => {
    if (state.screen !== 'play') draw();
  });
  const scoreFormat = new Intl.NumberFormat('en-IN');
  const symbols = ['☾', '✺', '☂', '∞'];
  const preferenceButtons = [...document.querySelectorAll('[data-preference]')];
  const arrows = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
  const keys = new Set();
  const panels = new Map(['menu', 'pause', 'result'].map(name => [name, $(name + '-panel')]));
  const state = {
    screen: 'menu',
    progress: loadProgress(),
    run: null,
    target: { x: 202, y: 271 },
    pointer: null,
    keyboardAim: false,
    chargeAt: null,
    effects: [],
    reactionAt: -Infinity,
    mood: null,
    moodUntil: 0,
    noticeUntil: 0,
  };
  const score = $('score');
  const ammo = $('ammo');
  const ammoHud = $('ammo-hud');
  const clock = $('clock');
  const clockLabel = $('clock-label');
  const timeFill = $('time-fill');
  const hearts = $('hearts');
  const pauseButton = $('pause');
  const reaction = $('reaction');
  const combo = $('combo');
  const waveNotice = $('wave-notice');
  const meter = $('charging');
  const chargeLabel = $('charge-label');
  const chargeFill = $('charge-fill');
  const hint = $('hint-text');
  let previousFrame = 0;
  let frameId = 0;
  let lastBites = -1;

  const setText = (element, text) => {
    const next = String(text);
    if (element.textContent !== next) element.textContent = next;
  };

  function renderPreferences() {
    for (const button of preferenceButtons) button.setAttribute('aria-pressed', String(settings[button.dataset.preference]));
  }

  function renderNights() {
    const list = $('night-list');
    list.replaceChildren();
    for (const [i, night] of NIGHTS.entries()) {
      const accessible = i <= state.progress.unlocked;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'night-button';
      button.disabled = !accessible;
      if (i === state.progress.unlocked) button.classList.add('recommended');
      const symbol = document.createElement('span');
      symbol.className = 'night-symbol';
      symbol.setAttribute('aria-hidden', 'true');
      symbol.textContent = symbols[i];
      const description = document.createElement('span');
      description.className = 'night-copy';
      const name = document.createElement('strong');
      name.textContent = night.name;
      const detail = document.createElement('small');
      detail.textContent = `${night.detail} · ${night.ammo} ammo`;
      description.append(name, detail);
      const badge = document.createElement('span');
      badge.className = 'night-record';
      badge.textContent = !accessible ? 'Locked' : state.progress.bests[i] ? `Best ${scoreFormat.format(state.progress.bests[i])}` : 'Play ↗';
      button.append(symbol, description, badge);
      button.addEventListener('click', () => start(i));
      list.append(button);
    }
  }

  function show(screen, focus = true) {
    state.screen = screen;
    document.body.dataset.screen = screen;
    $('overlay').hidden = screen === 'play';
    for (const [name, panel] of panels) panel.hidden = screen !== name;
    pauseButton.disabled = screen !== 'play';
    canvas.tabIndex = screen === 'play' ? 0 : -1;
    if (focus) (screen === 'play' ? canvas : $(screen + '-title')).focus({ preventScroll: true });
  }

  function prepareLoop() {
    previousFrame = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  function stopLoop() {
    cancelAnimationFrame(frameId);
    sound.threat(0);
  }

  function clearInput() {
    const activePointer = state.pointer;
    state.pointer = null;
    state.chargeAt = null;
    keys.clear();
    if (activePointer !== null && canvas.hasPointerCapture(activePointer)) canvas.releasePointerCapture(activePointer);
  }

  function showMenu(focus = true) {
    stopLoop();
    clearInput();
    state.run = null;
    state.effects = [];
    state.mood = null;
    reaction.hidden = true;
    renderNights();
    renderPreferences();
    show('menu', focus);
    draw();
  }

  function start(level) {
    if (level > state.progress.unlocked) return;
    stopLoop();
    clearInput();
    sound.unlock();
    state.run = new NightRun(level);
    state.target = { x: 202, y: 271 };
    state.keyboardAim = false;
    state.effects = [];
    state.mood = null;
    state.reactionAt = -Infinity;
    state.noticeUntil = 0;
    reaction.hidden = true;
    show('play');
    draw();
    prepareLoop();
  }

  function pause() {
    if (state.screen !== 'play') return;
    stopLoop();
    clearInput();
    show('pause');
    draw();
  }

  function resume() {
    if (state.screen !== 'pause' || document.hidden) return;
    sound.unlock();
    show('play');
    prepareLoop();
  }

  function finish() {
    stopLoop();
    clearInput();
    const { run } = state;
    const { progress, best } = recordNight(run, state.progress);
    state.progress = progress;
    const cleared = run.outcome === 'cleared';
    const outOfAmmo = run.lossCause === 'ammo';
    const endless = run.night.duration === Infinity;
    const previousNight = `${run.night.name} · ${formatTime(run.time)}`;
    const nextNight = NIGHTS[run.level + 1];
    setText($('result-night'), previousNight);
    setText($('result-title'), cleared ? 'Night cleared!' : outOfAmmo ? 'Out of ammo' : 'The mosquitoes win.');
    setText($('result-detail'), cleared ? `${nextNight.name} is unlocked.` : outOfAmmo
      ? 'Save a shot for the gold-winged carriers.'
      : 'Three bites. So much for sleep.');
    setText($('result-score'), scoreFormat.format(run.score));
    setText($('result-best'), best ? 'New personal best' : 'Score');
    setText($('result-hits'), run.hits);
    setText($('result-accuracy'), `${run.shots ? Math.round(run.landedShots / run.shots * 100) : 0}%`);
    setText($('result-streak'), run.bestStreak);
    $('next-night').hidden = !cleared || endless;
    if (cleared && !endless) setText($('next-night'), `Play ${nextNight.name} ↗`);
    $('retry').classList.toggle('primary', !cleared);
    reaction.hidden = true;
    show('result');
  }

  function formatTime(seconds) {
    const whole = Math.max(0, Math.floor(seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  }

  function syncHud(charge) {
    const { run } = state;
    const duration = run?.night.duration ?? NIGHTS[0].duration;
    const time = run?.time ?? 0;
    const bites = run?.bites ?? 0;
    const rounds = run?.ammo ?? NIGHTS[0].ammo;
    const endless = duration === Infinity;
    setText(score, scoreFormat.format(run?.score ?? 0));
    setText(ammo, rounds);
    ammoHud.classList.toggle('low', rounds <= 3);
    setText(clockLabel, run ? `Wave ${run.wave}${endless ? '' : '/3'}` : 'Time left');
    setText(clock, formatTime(endless ? time : Math.ceil(duration - time)));
    timeFill.style.transform = `scaleX(${endless ? 1 : 1 - time / duration})`;
    if (lastBites !== bites) {
      const remaining = 3 - bites;
      hearts.setAttribute('aria-label', `${remaining} ${remaining === 1 ? 'bite' : 'bites'} remaining`);
      [...hearts.children].forEach((heart, i) => heart.classList.toggle('spent', i >= remaining));
      lastBites = bites;
    }
    combo.hidden = !run || run.streak < 2 || state.screen !== 'play';
    if (!combo.hidden) setText(combo, `${run.streak}× streak`);
    waveNotice.hidden = state.screen !== 'play' || time >= state.noticeUntil;
    meter.hidden = !charge;
    if (charge) {
      meter.dataset.ready = String(charge.ready);
      chargeFill.style.transform = `scaleX(${charge.fill})`;
      setText(chargeLabel, charge.ready ? 'Release now!' : charge.past ? 'Quick shot ready' : 'Charging');
    }
    const hintText = state.screen === 'play' && state.keyboardAim
      ? 'Arrow keys aim · Hold and release Space to zap'
      : 'Hold to charge · Drag to aim · Release to zap';
    setText(hint, hintText);
  }

  function draw() {
    const { run } = state;
    const charge = state.chargeAt === null ? null : chargeState(run.time - state.chargeAt);
    syncHud(charge);
    ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    if (!run) {
      paint(ctx, { time: 1.3, bugs: [{ x: 328, y: 107, facing: -1 }, { x: 94, y: 414, facing: 1 }] });
      return;
    }
    if (!reaction.hidden && run.time - state.reactionAt > 1.55) reaction.hidden = true;
    paint(ctx, {
      level: run.level, time: run.time, bugs: run.bugs, target: state.target, charge, effects: state.effects,
      mood: run.time < state.moodUntil ? state.mood : null,
      keyboardAim: state.keyboardAim && state.screen === 'play',
    });
  }

  function addEffect(effect) {
    state.effects.push({ ...effect, born: state.run.time });
  }

  function announceReaction() {
    if (!settings.voice || state.run.time - state.reactionAt < 4.5) return;
    state.reactionAt = state.run.time;
    reaction.textContent = settings.theri ? 'Maa ka bhosada!' : 'Aiyyo!';
    reaction.hidden = false;
  }

  function frame(now) {
    if (state.screen !== 'play') return;
    const dt = Math.min(.05, Math.max(0, (now - previousFrame) / 1000));
    previousFrame = now;
    if (state.keyboardAim) {
      const move = dt * 265;
      const x = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
      const y = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'));
      state.target.x = Math.min(WIDTH - 8, Math.max(8, state.target.x + x * move));
      state.target.y = Math.min(SHOT_ORIGIN.y - 12, Math.max(12, state.target.y + y * move));
    }
    const { run } = state;
    for (const event of run.update(dt)) {
      if (event.type === 'bite') {
        addEffect({ ...event, color: '#ff9c88', label: 'BITE!', duration: .62 });
        state.mood = 'bite';
        state.moodUntil = run.time + .36;
        sound.play('bite');
        if (event.first) announceReaction();
      }
      if (event.type === 'cleared') sound.play('cleared');
      if (event.type === 'wave') {
        setText(waveNotice, `Wave ${event.number} · ${event.faster ? 'Faster flights' : 'Swarm incoming'}`);
        state.noticeUntil = run.time + 1.75;
      }
    }
    state.effects = state.effects.filter(effect => run.time - effect.born < effect.duration);
    const threats = run.bugs.some(bug => bug.warning);
    sound.threat(threats ? .02 : run.bugs.length ? .006 + run.bugs.length * .001 : 0);
    if (run.outcome) finish();
    draw();
    if (!run.outcome) frameId = requestAnimationFrame(frame);
  }

  function beginAim() {
    if (state.chargeAt !== null) return;
    sound.unlock();
    state.chargeAt = state.run.time;
  }

  function releaseShot(touch = false) {
    if (state.chargeAt === null) return;
    const { run } = state;
    const shot = run.shoot(state.target, run.time - state.chargeAt, touch ? TOUCH_AIM_PADDING : 0);
    state.chargeAt = null;
    if (!shot) return;
    const { direction, perfect, hits, ammoGained } = shot;
    const reach = hits.length ? hits[hits.length - 1].distance + 16 : 650;
    addEffect({ type: 'spark', direction, perfect, reach, duration: .24 });
    sound.play(perfect ? 'perfect' : 'shot');
    if (ammoGained) sound.play('refill');
    else if (hits.length) sound.play('hit');
    for (const hit of hits) {
      addEffect({ type: 'hit', x: hit.bug.x, y: hit.bug.y, color: perfect ? '#ffdd8d' : '#e2d2fe', label: `+${hit.points}`, duration: .58 });
    }
    if (hits.length > 1) {
      addEffect({ type: 'hit', x: 210, y: 435, color: '#ffda86', label: 'DOUBLE ZAP!', duration: .75 });
    }
    if (ammoGained) {
      const { bug } = hits.find(hit => hit.bug.supply) ?? hits[0];
      const x = Math.min(WIDTH - 50, Math.max(50, bug.x));
      addEffect({ type: 'hit', x, y: bug.y + 34, color: '#c2f6c9', label: `+${ammoGained} AMMO`, duration: .85 });
    }
    if (shot.bigCombo) announceReaction();
    state.mood = 'shot';
    state.moodUntil = run.time + .23;
  }

  function pointAt(event) {
    const rect = canvas.getBoundingClientRect();
    state.target.x = Math.max(0, Math.min(WIDTH, (event.clientX - rect.left) / rect.width * WIDTH));
    state.target.y = Math.max(0, Math.min(SHOT_ORIGIN.y - 7, (event.clientY - rect.top) / rect.height * HEIGHT));
  }

  canvas.addEventListener('pointerdown', event => {
    if (state.screen !== 'play' || state.pointer !== null || state.chargeAt !== null || event.button !== 0) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    state.pointer = event.pointerId;
    state.keyboardAim = false;
    keys.clear();
    pointAt(event);
    beginAim();
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId === state.pointer) pointAt(event);
  });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerId !== state.pointer) return;
    pointAt(event);
    state.pointer = null;
    releaseShot(event.pointerType === 'touch');
  });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, event => {
      if (event.pointerId === state.pointer) clearInput();
    });
  }
  canvas.addEventListener('blur', clearInput);
  canvas.addEventListener('contextmenu', event => event.preventDefault());

  document.addEventListener('keydown', event => {
    if (['Escape', 'KeyP'].includes(event.code) && !event.repeat) {
      if (state.screen === 'play') pause();
      else if (state.screen === 'pause') resume();
      return;
    }
    if (document.activeElement !== canvas || state.screen !== 'play' || state.pointer !== null) return;
    if (arrows.has(event.code)) {
      event.preventDefault();
      state.keyboardAim = true;
      keys.add(event.code);
    } else if (event.code === 'Space') {
      event.preventDefault();
      state.keyboardAim = true;
      if (!event.repeat) beginAim();
    }
  });
  document.addEventListener('keyup', event => {
    keys.delete(event.code);
    if (event.code === 'Space' && state.screen === 'play' && state.pointer === null && state.keyboardAim) {
      event.preventDefault();
      releaseShot();
    }
  });
  window.addEventListener('blur', pause);
  window.addEventListener('pagehide', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    preferences.refresh();
    const stored = loadProgress();
    state.progress.unlocked = Math.max(state.progress.unlocked, stored.unlocked);
    state.progress.bests = state.progress.bests.map((best, i) => Math.max(best, stored.bests[i]));
    if (state.screen === 'menu') {
      renderNights();
      renderPreferences();
    }
  });

  pauseButton.addEventListener('click', pause);
  $('resume').addEventListener('click', resume);
  $('paused-retry').addEventListener('click', () => start(state.run.level));
  $('retry').addEventListener('click', () => start(state.run.level));
  $('next-night').addEventListener('click', () => start(state.run.level + 1));
  $('paused-menu').addEventListener('click', () => showMenu());
  $('result-menu').addEventListener('click', () => showMenu());
  for (const button of preferenceButtons) {
    button.addEventListener('click', () => {
      const key = button.dataset.preference;
      preferences.set(key, !settings[key]);
      renderPreferences();
    });
  }

  showMenu(false);
}
