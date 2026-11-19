// Local-only QA controls. This module is omitted from production builds.
import { CHAPTERS } from './game/story.js';
import { makeBus, makeAuto } from './entities/vehicles.js';
import * as THREE from 'three';

export function installInspector({ game, stage, startRun, toMenu, getState, device }) {
  const panel = document.createElement('aside');
  panel.id = 'inspector';
  panel.style.cssText = 'position:fixed;z-index:12;top:70px;left:12px;background:#102d26ed;border:1px solid #f1cb77;color:#fff6df;padding:10px;border-radius:8px;font:11px system-ui;max-width:220px;max-height:calc(100dvh - 80px);overflow:auto;touch-action:pan-y';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'QA chapter');
  CHAPTERS.forEach((ch, i) => select.add(new Option(ch.name, i)));
  const play = document.createElement('button');
  play.textContent = 'Test chapter';
  play.onclick = () => { toMenu(); startRun(Number(select.value)); };
  const auto = document.createElement('input'); auto.type = 'checkbox'; auto.id = 'qa-auto';
  const autoLabel = document.createElement('label'); autoLabel.htmlFor = auto.id; autoLabel.textContent = ' Auto swing';
  const touch = document.createElement('input'); touch.type = 'checkbox'; touch.id = 'qa-touch'; touch.checked = device.touch;
  const touchLabel = document.createElement('label'); touchLabel.htmlFor = touch.id; touchLabel.textContent = ' Touch UI preview';
  touch.onchange = () => {
    document.documentElement.classList.toggle('touch', touch.checked);
    game.touch = touch.checked;
    document.getElementById('touch-controls').classList.toggle('hidden', !touch.checked || getState() !== 'play');
  };
  const stats = document.createElement('output'); stats.style.cssText = 'display:block;margin-top:6px;white-space:pre-line';
  const boss = document.createElement('button'); boss.textContent = 'Test boss contact';
  boss.onclick = () => {
    if (getState() !== 'play' || !game.kutt.active) return;
    const el = game.level.elephants.find(e => e.variant !== 'baby' && e.group.position.x > game.sw.pos.x) || game.level.elephants.find(e => e.variant !== 'baby');
    if (!el) return;
    game.detach(); game.setHold(false);
    if (game.sling) game.sling.el.release();
    game.sling = null; game.fallT = 0; game.dying = 0; game.slowmo = 0; game.acc = 0;
    const p = el.group.localToWorld(new THREE.Vector3(-2.3, 5.1, 0.4));
    Object.assign(game.sw.pos, { x: p.x, y: p.y });
    Object.assign(game.sw.vel, { x: 0, y: 0 });
    game.kutt.el = el; game.kutt.state = 'sit';
    game.invuln = 2;
  };
  const finish = document.createElement('button'); finish.textContent = 'Test results';
  finish.onclick = () => { if (getState() === 'play') game.end(); };
  const tea = document.createElement('button'); tea.textContent = 'Test chaya combo';
  tea.onclick = () => {
    if (getState() !== 'play') return;
    game.perks.launch(); game.collect('fritter'); game.collect('chaya');
  };
  const rhythm = document.createElement('button'); rhythm.textContent = 'Test rhythm catch';
  rhythm.onclick = () => {
    if (getState() !== 'play') return;
    const anchor = game.level.elephants.find(e => e !== game.current?.el && e.group.position.x > game.sw.pos.x)?.trunkAnchor;
    if (!anchor) return;
    game.detach(); game.fallT = 0; game.dying = 0;
    if (game.sling) game.sling.el.release(); game.sling = null;
    game.sw.reset(anchor.pos.x + .4, anchor.pos.y - 2.6);
    game.style = { perfect: true, beat: true, fromX: anchor.pos.x - 4 };
    game.attach(anchor); game.holding = true;
  };
  const hide = document.createElement('button'); hide.textContent = 'Hide QA'; hide.onclick = () => { panel.hidden = true; };
  const inspect = side => {
    if (getState() !== 'play') return;
    const el = game.current?.el || game.level.elephants[0];
    if (!el) return;
    game.paused = true;
    const p = el.group.position;
    stage.camera.position.set(p.x + side * 7, p.y + 4, 11);
    stage.camera.lookAt(p.x, p.y + 2.6, 0);
  };
  const face = document.createElement('button'); face.textContent = 'Inspect face'; face.onclick = () => inspect(-1);
  const rump = document.createElement('button'); rump.textContent = 'Inspect rump'; rump.onclick = () => inspect(1);
  const normal = document.createElement('button'); normal.textContent = 'Resume view'; normal.onclick = () => { game.paused = false; };
  const action = (name, run) => {
    const button = document.createElement('button');
    button.textContent = name;
    button.onclick = () => { if (getState() === 'play') run(); };
    return button;
  };
  const impact = type => {
    if (game.fallT || game.dying) return;
    game.invuln = 0;
    game.spawnProjectile(type, game.sw.pos.x, game.sw.pos.y + 0.6, 0, -4, 22);
  };
  const coconut = action('Test coconut hit', () => impact('coconut'));
  const banana = action('Test banana hit', () => impact('banana'));
  const theri = action('Test Theri Mode', () => game.addTheri(1));
  const radio = action('Test radio', () => game.audio.playRadio());
  const reply = action('Test Myre', () => game.shout(true));
  const quip = action('Test random clip', () => game.audio.randomQuip());
  const dropOn = (place) => {
    if (game.fallT || game.dying || game.sling) return;
    game.detach();
    game.setHold(false);
    game.bounceCooldown = 0;
    game.bounceSpring = null;
    const { x } = game.sw.pos;
    const mesh = place(x);
    game.sw.reset(x, mesh.userData.top + 2.85);
    game.sw.vel.y = -15;
  };
  const testRoof = (make, label) => dropOn(x => {
    const mesh = make();
    return game.level.addVehicle(mesh, x - (mesh.userData.center ?? 0), -0.8, label).mesh;
  });
  const bus = action('Test KSRTC', () => testRoof(makeBus, 'KSRTC RESCUE!'));
  const autoRoof = action('Test auto', () => testRoof(makeAuto, 'AUTO CHETTAN SAVE!'));
  const boat = action('Test vallam', () => dropOn(x => game.level.addBoat(x, -0.8, true).mesh));
  const line = () => panel.append(document.createElement('br'));
  panel.append('LOCAL QA · not included in release'); line(); panel.append(select, play); line();
  panel.append(auto, autoLabel); line(); panel.append(touch, touchLabel); line(); panel.append(boss, finish); line(); panel.append(tea, rhythm); line(); panel.append(face, rump, normal); line(); panel.append(coconut, banana); line(); panel.append(radio, reply, theri, quip); line(); panel.append(bus, autoRoof, boat); line(); panel.append(hide, stats);
  document.body.append(panel);
  let frames = 0, elapsed = 0, display = 0;
  const original = game.update.bind(game);
  game.update = dt => {
    if (auto.checked && getState() === 'play') game.autopilot();
    original(dt);
    frames++; elapsed += dt; display += dt;
    if (display < 0.5) return;
    const info = stage.renderer.info;
    const v = game.sw.vel;
    const sound = game.audio;
    const clip = sound.reaction && Object.keys(sound.clips).find(name => sound.clips[name] === sound.reaction.buffer);
    const loop = sound.chapterMusicTitle;
    const soundStatus = clip ? `Voice · ${sound.reactionRole} · ${clip}` : sound.radioActive ? 'Onam playing' : loop ? `${loop} looping` : sound.melam ? 'Recorded melam looping' : 'Melam stopped';
    stats.textContent = `${getState()} · ${Math.round(frames / elapsed)} fps\n${info.render.calls} draws · ${Math.round(info.render.triangles / 1000)}k triangles\n${info.memory.geometries} geometries · ${info.memory.textures} textures\n${game.snapshot().distance}m · ${game.health} HP · ${Math.hypot(v.x, v.y).toFixed(1)}m/s\n${soundStatus}`;
    frames = 0; elapsed = 0; display = 0;
  };
}
