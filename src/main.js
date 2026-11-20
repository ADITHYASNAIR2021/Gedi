// Boot + app state machine: menu (attract demo) → story → play → chapter cards → game over.
import { getDeviceProfile } from './core/device.js';
import { save } from './core/storage.js';
import { leaderboard } from './core/leaderboard.js';
import { GameAudio } from './core/audio.js';
import { Stage } from './world/scene.js';
import { Environment } from './world/environment.js';
import { Fx } from './world/fx.js';
import { Level } from './game/level.js';
import { Game } from './game/game.js';
import { TUNING } from './game/swing.js';
import { Gedi } from './entities/gedi.js';
import { prepareTusker } from './entities/tusker-model.js';
import { prepareVehicles } from './entities/vehicles.js';
import { Hud } from './ui/hud.js';
import { AANAS } from './game/aanas.js';
import { Route, CHAPTERS, ENCORE, INTRO, CHAPTER_CARDS, KOTTAYAM, VICTORY, GAME_OVER_LINES, fmt, pick } from './game/story.js';

const $ = (id) => document.getElementById(id);
const INTRO_VERSION = 2;

async function boot() {
const device = getDeviceProfile();
if (import.meta.env.DEV && new URLSearchParams(location.search).has('mobile')) {
  Object.assign(device.quality, { pixelRatio: 1, shadows: false, antialias: false, propDensity: 0.5 });
  device.touch = true;
}
document.documentElement.classList.toggle('touch', device.touch);
const settings = save.data.settings;
const audio = new GameAudio(settings);
let stage;
try {
  stage = new Stage($('c'), device.quality);
} catch (error) {
  $('boot-error').classList.remove('hidden');
  $('boot-message').textContent = 'Your browser could not start 3D graphics. Try enabling hardware acceleration or opening this game in a recent browser.';
  throw error;
}
await Promise.all([prepareTusker(!device.quality.shadows), stage.prepareLighting(), stage.prepareBackwaters(), prepareVehicles()]);
const route = new Route();
const env = new Environment(stage.scene, device.quality.propDensity, route);
const level = new Level(stage.scene, route);
const fx = new Fx(stage.scene);
const gedi = new Gedi();
stage.scene.add(gedi.group, gedi.contact);
const hud = new Hud();
const game = new Game({ stage, env, level, route, fx, audio, hud, gedi, settings, touch: device.touch });

let state = 'menu';
let lastRun = null;
let pressed = false;
let activePointer = null;
const heldKeys = new Set();

function clearInput() {
  pressed = false;
  activePointer = null;
  heldKeys.clear();
  $('btn-swing').classList.remove('is-held');
}

// story text carries "[[spicy|clean]]" variants for the Theri toggle
const panels = (list) => list.map((p) => ({ ...p, title: fmt(p.title, settings.theri), text: fmt(p.text, settings.theri) }));
const continueChapter = () => Math.min(save.data.bestChapter, CHAPTERS.length) - 1;

// ---------- menu ----------
function refreshMenu() {
  const d = save.data;
  $('m-best').textContent = d.best
    ? `Best ${d.best} · ${d.bestDistance} m · Chapter ${Math.min(d.bestChapter, 5)}${d.bestChapter > 5 ? ' ★' : ''} · ${d.runs} runs`
    : 'No runs yet. Gedi is waiting!';
  $('m-device').textContent = device.touch ? 'Best played sideways · touch anywhere to swing' : 'Mouse or Space to swing · P to pause';
  for (const key of ['sound', 'music', 'voice', 'theri']) {
    $(`t-${key}`).classList.toggle('on', settings[key]);
    $(`t-${key}`).setAttribute('aria-pressed', String(settings[key]));
  }
  const cont = $('btn-continue');
  cont.classList.toggle('hidden', d.bestChapter < 2);
  if (d.bestChapter >= 2) cont.textContent = `Continue · Ch ${continueChapter() + 1} ${CHAPTERS[continueChapter()].name}`;
  $('btn-encore').classList.toggle('hidden', !d.encoreUnlocked && d.bestChapter <= ENCORE);
  hud.setBest(d.best);
  hud.setTheriIcon(settings.theri);
}

function toMenu() {
  clearInput();
  state = 'menu';
  hud.setPlaying(false);
  audio.stopMusic();
  audio.clearReaction();
  game.start({ demo: true });
  refreshMenu();
  hud.show('screen-menu');
}

async function startRun(chapter = 0) {
  if (!['menu', 'over', 'album'].includes(state)) return;
  state = 'starting';
  clearInput();
  audio.unlock();
  audio.clearReaction();
  if (save.data.intro !== INTRO_VERSION) {
    state = 'story';
    await hud.story(panels(INTRO));
    save.set('intro', INTRO_VERSION);
  }
  hud.hideScreens();
  hud.setPlaying(true);
  game.start({ chapter, teach: chapter !== ENCORE && save.data.runs < 3 });
  state = 'play';
  pressed = false;
  audio.play('trumpet');
  hud.banner(game.cfg.name, game.cfg.place);
}

// ---------- in-game events ----------
game.on('aana', (aana) => {
  if (!save.discoverAana(aana.id)) return;
  hud.aanaUnlock(aana.name);
  audio.play('collect', 4);
});

game.on('chapter', async ({ chapter, caught, victory }) => {
  if (state !== 'play') return;
  state = 'card';
  clearInput();
  hud.hint(null);
  if (!victory && game.chapter.index + 1 > save.data.bestChapter) save.set('bestChapter', game.chapter.index + 1);
  if (victory) {
    save.set('encoreUnlocked', true);
    audio.play('fanfare');
    audio.say('Gedi got the Nettipattam! Pwoli!', true);
    await hud.story(panels([{ ...VICTORY, cta: 'Encore! ▶' }]));
  } else {
    const card = CHAPTER_CARDS[chapter + 1];
    const lead = caught ? '<b>BONK!</b> Kuttappan dropped a banana peel and fled. ' : 'Kuttappan slipped away! ';
    const next = { ...card, text: lead + card.text, cta: 'Chase him! ▶' };
    await hud.story(panels(chapter === 1 ? [KOTTAYAM, next] : [next]));
  }
  hud.hideScreens();
  clearInput();
  game.setHold(true);
  hud.banner(game.cfg.name, game.cfg.place);
  const recovered = game.heal(20);
  if (recovered) game.pop(`RECOVERED +${recovered} HP`, 'gold');
  state = 'play';
});

game.on('over', (run) => {
  if (state !== 'play') return toMenu();
  state = 'over';
  lastRun = run;
  hud.hint(null);
  hud.setRage(false);
  const isBest = save.recordRun(run);
  hud.setBest(save.data.best);
  $('o-title').textContent = isBest ? 'THAKARTHU!' : 'Aiyyo!';
  $('o-line').textContent = pick(GAME_OVER_LINES);
  $('o-score').textContent = run.score;
  $('o-newbest').classList.toggle('hidden', !isBest);
  $('o-stats').innerHTML = [
    ['Distance', `${run.distance} m`],
    ['Chapter', run.chapter > ENCORE ? 'Encore' : run.chapter],
    ['Elephants', run.elephants],
    ['Pwoli releases', run.perfects],
    ['Chaya combos', run.teaCombos || 0],
    ['Rhythm best', run.rhythmBest || 0],
    ['Anjaamkaal saves', run.anjaam],
    [settings.theri ? 'Theri count' : 'Aiyyo count', run.theri],
  ].map(([k, v]) => `<div>${k} <b>${v}</b></div>`).join('');
  const names = [...new Set(run.names)].slice(0, 6);
  $('o-album').innerHTML = names.length ? `Aanas you rode: <b>${names.join(', ')}</b>${run.elephants > names.length ? ' …' : ''}` : '';
  // retry from the chapter you reached; a fresh run stays one tap away
  const retryChapter = run.chapter - 1;
  $('o-retry').textContent = retryChapter === ENCORE ? 'Retry Encore' : retryChapter > 0 ? `Retry Chapter ${retryChapter + 1}` : 'Again!';
  $('o-retry').onclick = () => startRun(retryChapter);
  $('o-new').classList.toggle('hidden', retryChapter === 0);
  $('o-msg').textContent = '';
  $('o-name').value = save.data.name;
  $('o-submit').classList.toggle('hidden', leaderboard.configured === false);
  if (leaderboard.configured === false) $('o-msg').textContent = 'Best score saved on this device.';
  hud.show('screen-over');
  if (save.data.name && leaderboard.configured !== false) submitScore();
});

async function submitScore() {
  if (!lastRun) return;
  const name = $('o-name').value.trim().slice(0, 16);
  if (!name) { $('o-msg').textContent = 'Enter a name first, ishtaa!'; return; }
  save.set('name', name);
  $('o-msg').textContent = 'Sending to the Hall of Gedis…';
  const { score, distance, chapter, duration } = lastRun;
  const res = await leaderboard.submit({ deviceId: device.id, name, device: device.short, score, distance, chapter, duration });
  if (res.ok) {
    $('o-msg').textContent = `Leaderboard rank #${res.rank} (device best ${res.best})`;
  } else if (leaderboard.configured === false) {
    $('o-msg').textContent = 'Leaderboard offline — best saved on this device.';
    $('o-submit').classList.add('hidden');
  } else {
    $('o-msg').textContent = res.error === 'slow down' ? 'Easy, wait a few seconds.' : 'Could not reach the leaderboard.';
  }
}

async function showBoard() {
  state = 'board';
  hud.show('screen-board');
  $('b-list').replaceChildren();
  $('b-msg').textContent = 'Loading…';
  const { top, me } = await leaderboard.fetchTop(device.id);
  if (leaderboard.configured === false) {
    $('b-msg').textContent = `Global leaderboard not set up yet. Your device best: ${save.data.best}`;
    return;
  }
  if (me) save.mergeServerBest(me.score);
  hud.renderBoard(top, me);
}

function pause() {
  if (state !== 'play') return;
  state = 'pause';
  clearInput();
  audio.pause();
  hud.show('screen-pause');
}

function resume() {
  if (document.hidden) return;
  hud.hideScreens();
  audio.resume();
  clearInput();
  // Keep the current trunk secure until the player deliberately releases again.
  game.setHold(true);
  state = 'play';
}

// ---------- input ----------
const isUi = (e) => e.target.closest?.('button, input, .screen, #inspector');
const down = () => {
  pressed = true;
  game.setHold(true);
  $('btn-swing').classList.add('is-held');
};
const up = () => {
  if (state === 'play' && pressed) game.setHold(false);
  pressed = false;
  $('btn-swing').classList.remove('is-held');
};
window.addEventListener('pointerdown', (e) => {
  const swingButton = e.target.closest?.('#btn-swing');
  if (state !== 'play' || (isUi(e) && !swingButton) || activePointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
  audio.unlock();
  e.preventDefault();
  activePointer = e.pointerId;
  e.target.setPointerCapture?.(e.pointerId);
  down();
}, { passive: false });
window.addEventListener('pointerup', (e) => {
  if (e.pointerId !== activePointer) return;
  activePointer = null;
  if (!heldKeys.size) up();
});
window.addEventListener('pointercancel', (e) => {
  if (e.pointerId !== activePointer) return;
  clearInput();
  pause();
});
const KEYS = ['Space', 'ArrowUp', 'KeyW', 'Enter'];
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.target.closest?.('input,textarea,[contenteditable="true"]')) return;
  if (KEYS.includes(e.code) && state === 'play') {
    e.preventDefault();
    audio.unlock();
    heldKeys.add(e.code);
    down();
  }
  if (['KeyP', 'Escape'].includes(e.code)) state === 'play' ? pause() : state === 'pause' && resume();
});
window.addEventListener('keyup', (e) => {
  if (!heldKeys.delete(e.code)) return;
  if (!heldKeys.size && activePointer === null) up();
});
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', pause);

$('btn-fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
    } else {
      const root = document.documentElement;
      const request = root.requestFullscreen || root.webkitRequestFullscreen;
      if (!request) { $('btn-fullscreen').textContent = 'Use your browser’s fullscreen option'; return; }
      await request.call(root);
      try { await screen.orientation?.lock?.('landscape'); } catch { /* iOS and windowed browsers can decline */ }
    }
  } catch { $('btn-fullscreen').textContent = 'Fullscreen unavailable'; }
};
document.addEventListener('fullscreenchange', () => {
  $('btn-fullscreen').innerHTML = document.fullscreenElement ? '⛶ <span>Exit fullscreen</span>' : '⛶ <span>Fullscreen</span>';
  stage.resize();
});
$('c').addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  pause();
  $('boot-message').textContent = '3D graphics were interrupted. Tap below to restart the game; your saved best score is safe.';
  $('boot-error').classList.remove('hidden');
});

$('btn-play').onclick = () => startRun(0);
$('btn-continue').onclick = () => startRun(continueChapter());
$('btn-encore').onclick = () => startRun(ENCORE);
$('btn-story').onclick = async () => {
  audio.unlock();
  state = 'story';
  await hud.story(panels(INTRO));
  save.set('intro', INTRO_VERSION);
  state = 'menu';
  hud.show('screen-menu');
};
$('btn-board').onclick = showBoard;
$('btn-album').onclick = () => {
  state = 'album';
  hud.renderAlbum(AANAS, CHAPTERS, save.data.aanas, Math.max(0, continueChapter()));
  hud.show('screen-album');
  $('a-back').focus();
};
$('a-back').onclick = () => {
  state = 'menu';
  hud.show('screen-menu');
  $('btn-album').focus();
};
$('a-replay').onclick = () => startRun(Number($('a-chapter').value));
$('b-back').onclick = () => { state = 'menu'; hud.show('screen-menu'); };
$('btn-pause').onclick = pause;
$('p-resume').onclick = resume;
$('p-quit').onclick = () => { audio.resume(); toMenu(); };
$('o-new').onclick = () => startRun(0);
$('o-menu').onclick = toMenu;
$('o-send').onclick = submitScore;
$('o-name').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') submitScore(); });
for (const key of ['sound', 'music', 'voice', 'theri']) {
  $(`t-${key}`).onclick = () => {
    save.setSetting(key, !settings[key]);
    audio.applySettings();
    refreshMenu();
  };
}

// ---------- loop ----------
window.addEventListener('resize', () => {
  stage.resize();
  if (window.innerWidth < 600 && window.innerHeight > window.innerWidth) pause();
});
window.visualViewport?.addEventListener('resize', () => stage.resize());
stage.resize();

let prev = performance.now();
let frameAverage = 1 / 60;
let slowRenderTime = 0;
function frame(now) {
  const elapsed = (now - prev) / 1000;
  const dt = Math.min(elapsed, 0.1);
  prev = now;
  // Keep the default graphics until several seconds of sustained slow rendering.
  if (!document.hidden && (state === 'play' || state === 'menu')) {
    const sample = Math.min(elapsed, 0.25);
    frameAverage += (sample - frameAverage) * (1 - Math.exp(-sample * 2));
    const renderer = stage.renderer;
    const ratio = renderer.getPixelRatio();
    const slow = frameAverage > 1 / 36;
    const severe = frameAverage > 1 / 24;
    slowRenderTime = slow ? slowRenderTime + sample : 0;
    if (slowRenderTime >= 5) {
      if (ratio > 1) {
        renderer.setPixelRatio(Math.max(1, ratio - 0.2));
        stage.resize();
      } else if (severe && renderer.shadowMap.enabled) {
        renderer.shadowMap.enabled = false;
        stage.sun.castShadow = false;
      } else if (severe && ratio > 0.8) {
        renderer.setPixelRatio(0.8);
        stage.resize();
      }
      slowRenderTime = 0;
    }
  } else {
    slowRenderTime = 0;
  }
  if (state === 'menu' || state === 'board' || state === 'story' || state === 'play') game.update(dt);
  stage.render();
  requestAnimationFrame(frame);
}

$('loading').classList.add('hidden');
toMenu();
requestAnimationFrame(frame);

leaderboard.fetchTop(device.id).then(({ me }) => {
  if (me) { save.mergeServerBest(me.score); refreshMenu(); }
});

// debug handle for testing and live tuning in the browser console
window.__gedi = { game, device, save, tuning: TUNING };

if (import.meta.env.DEV && new URLSearchParams(location.search).has('inspect')) {
  import('./devtools.js').then(({ installInspector }) => installInspector({
    game, stage, startRun, toMenu, device, getState: () => state,
  }));
}
}
boot().catch(error => {
  console.error('Game could not start', error);
  $('loading').classList.add('hidden');
  $('boot-error').classList.remove('hidden');
});
