// DOM overlay: HUD, popups, speech bubbles, banners and screen switching.

const $ = (id) => document.getElementById(id);

const SCREENS = ['screen-menu', 'screen-story', 'screen-over', 'screen-board', 'screen-pause', 'screen-album'];

export class Hud {
  constructor() {
    this.el = {
      hud: $('hud'), score: $('h-score'), dist: $('h-dist'), best: $('h-best'), chapter: $('h-chapter'),
      progress: $('h-progress'), health: $('h-health'), healthPanel: $('health-panel'), healthMeter: $('h-health-meter'),
      combo: $('h-combo'), shield: $('h-shield'), magnet: $('h-magnet'),
      drum: $('h-drum'), musicMode: $('music-mode'), theri: $('h-theri-fill'),
      popups: $('popups'), banner: $('banner'), hint: $('hint'),
    };
    this.last = {};
    this.lastPopupAt = 0;
    this.drumT = 0;
    this.hintText = null;
  }

  show(id) {
    document.body.classList.toggle('screen-open', !!id);
    for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
  }

  hideScreens() { this.show(null); }

  setPlaying(on) {
    this.el.hud.classList.toggle('hidden', !on);
    $('touch-controls').classList.toggle('hidden', !on || !document.documentElement.classList.contains('touch'));
    if (!on) {
      this.el.popups.replaceChildren();
      this.el.banner.classList.add('hidden');
      $('aana-unlock').classList.add('hidden');
      clearTimeout(this.unlockTimer);
    }
  }

  setBest(best) { this.el.best.textContent = best; }

  setRage(on) { document.body.classList.toggle('rage', on); }

  setTheriIcon(spicy) { $('h-theri-icon').textContent = spicy ? '🤬' : '😤'; }

  hint(text) {
    if (text === this.hintText) return;
    this.hintText = text;
    this.el.hint.classList.toggle('hidden', !text);
    if (text) this.el.hint.textContent = text;
  }

  update(s) {
    const L = this.last;
    const musicMode = s.theriMix ? 'THERI MIX' : s.radio ? '♫ ONAM RADIO' : s.soundtrack ? `♫ ${s.soundtrack}` : 'THAALAM';
    if (L.musicMode !== musicMode) {
      this.el.musicMode.textContent = musicMode;
      L.musicMode = musicMode;
    }
    const rhythm = s.rhythm || 0;
    if (L.rhythm !== rhythm) {
      const titles = ['Find the beat', 'Melam warming up', 'Pooram rising', 'POORAM UNLEASHED'];
      $('h-rhythm').textContent = rhythm ? `${rhythm} on beat · ${titles[s.festival || 0]}` : titles[0];
      $('festival-hud').classList.toggle('is-building', rhythm >= 3);
      document.querySelectorAll('.rhythm-pips i').forEach((pip, i) => pip.classList.toggle('lit', i < Math.min(9, rhythm)));
      L.rhythm = rhythm;
    }
    $('festival-hud').style.setProperty('--beat-glow', String(Math.max(0, 1 - s.beat) * .3));
    const persona = s.personality;
    if (L.persona !== persona?.label) {
      $('personality-hud').classList.toggle('hidden', !persona);
      if (persona) {
        $('h-personality').textContent = persona.label;
        $('h-personality-detail').textContent = persona.detail;
        $('h-personality-color').style.background = persona.color;
      }
      L.persona = persona?.label;
    }
    const tea = !!s.teaCombo || !!s.teaCharge;
    $('tea-hud').classList.toggle('hidden', !tea);
    if (L.teaCharge !== s.teaCharge) {
      $('h-tea-detail').textContent = s.teaCharge ? 'Chaya + pazhampori · +75 · next launch boosted' : 'Pazhampori + chaya · +75';
      L.teaCharge = s.teaCharge;
    }
    if (L.attached !== s.attached) {
      $('swing-label').textContent = s.attached ? 'RELEASE TO FLY' : 'HOLD TO GRAB';
      $('swing-detail').textContent = s.attached ? 'Wait for the gold arc' : 'Aim for the gold ring';
      L.attached = s.attached;
    }
    if (L.perfect !== s.perfect) {
      $('btn-swing').classList.toggle('is-perfect', s.perfect);
      L.perfect = s.perfect;
    }
    if (L.score !== s.score) this.el.score.textContent = L.score = s.score;
    if (L.distance !== s.distance) this.el.dist.textContent = L.distance = s.distance;
    if (L.chapter !== s.chapterName) this.el.chapter.textContent = L.chapter = s.chapterName;
    const pct = Math.round(Math.min(1, Math.max(0, s.progress)) * 100);
    if (L.pct !== pct) { this.el.progress.style.width = `${pct}%`; L.pct = pct; }
    if (L.health !== s.health) {
      const { health, healthPanel, healthMeter } = this.el;
      health.textContent = s.health;
      healthMeter.setAttribute('aria-valuenow', s.health);
      healthPanel.style.setProperty('--health', s.health / 100);
      healthPanel.classList.toggle('is-low', s.health > 0 && s.health <= 30);
      healthPanel.classList.toggle('is-hit', L.health > s.health);
      L.health = s.health;
    }
    if (L.combo !== s.combo) { this.el.combo.textContent = s.combo > 1 ? `×${s.combo}` : ''; L.combo = s.combo; }
    if (L.shield !== s.shield) { this.el.shield.classList.toggle('hidden', !s.shield); L.shield = s.shield; }
    if (L.magnet !== s.magnet) { this.el.magnet.classList.toggle('hidden', !s.magnet); L.magnet = s.magnet; }
    const theri = Math.round(s.theri * 100);
    if (L.theri !== theri) { this.el.theri.style.width = `${theri}%`; L.theri = theri; }
    const beat = 1 - s.beat;
    this.el.drum.style.transform = `scale(${1 + beat * beat * 0.35})`;
    if (this.drumT && performance.now() > this.drumT) { this.el.drum.classList.remove('hit'); this.drumT = 0; }
  }

  drumHit() {
    this.el.drum.classList.add('hit');
    this.drumT = performance.now() + 300;
  }

  aanaUnlock(name) {
    const toast = $('aana-unlock');
    $('aana-unlock-name').textContent = name;
    toast.classList.remove('hidden');
    clearTimeout(this.unlockTimer);
    this.unlockTimer = setTimeout(() => toast.classList.add('hidden'), 3600);
  }

  renderAlbum(entries, chapters, unlocked, latestChapter) {
    const list = $('a-list');
    list.replaceChildren();
    $('a-count').textContent = `${entries.filter(aana => unlocked[aana.id]).length} of ${entries.length} discovered`;
    for (const aana of entries) {
      const item = document.createElement('li');
      item.classList.toggle('is-found', !!unlocked[aana.id]);
      const icon = document.createElement('span');
      icon.textContent = unlocked[aana.id] ? '🐘' : '◇';
      icon.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('div');
      const name = document.createElement('b');
      name.textContent = aana.name;
      const detail = document.createElement('small');
      detail.textContent = `${chapters[aana.chapter].name} · ${unlocked[aana.id] ? 'Discovered' : 'To find'}`;
      copy.append(name, detail);
      item.append(icon, copy);
      list.append(item);
    }
    const select = $('a-chapter');
    select.replaceChildren(...chapters.slice(0, latestChapter + 1).map((ch, i) => new Option(ch.name, String(i))));
    select.value = String(latestChapter);
    list.scrollTop = 0;
  }

  popup(text, xPct, yPct, cls = '') {
    const now = performance.now();
    if (['name', 'taunt', 'bubble', 'theri'].includes(cls) && now - this.lastPopupAt < 900) return;
    this.lastPopupAt = now;
    // One message per type and at most three messages keeps the flight path clear.
    [...this.el.popups.children].filter(el => cls && el.classList.contains(cls)).forEach(el => el.remove());
    const d = document.createElement('div');
    d.className = `pop ${cls}`;
    d.textContent = text;
    d.style.left = `${Math.min(85, Math.max(15, xPct))}%`;
    d.style.top = `${Math.min(82, Math.max(16, yPct))}%`;
    this.el.popups.appendChild(d);
    setTimeout(() => d.remove(), cls === 'rage' ? 1800 : 1400);
    if (this.el.popups.childElementCount > 3) this.el.popups.firstElementChild.remove();
  }

  banner(title, sub = '') {
    const b = this.el.banner;
    b.querySelector('.b-title').textContent = title;
    b.querySelector('.b-sub').textContent = sub;
    b.classList.remove('hidden');
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => b.classList.add('hidden'), 3000);
  }

  // Story panels: resolves when the player finishes or skips.
  story(panels) {
    return new Promise((resolve) => {
      let i = 0;
      const media = $('s-media');
      const render = () => {
        const p = panels[i];
        media.replaceChildren();
        if (p.img) {
          const img = new Image();
          img.src = p.img;
          img.alt = p.alt || 'Gedi';
          media.appendChild(img);
        } else {
          media.textContent = p.emoji || '🐘';
        }
        $('s-title').textContent = p.title;
        $('s-text').innerHTML = p.text;
        $('s-next').textContent = i === panels.length - 1 ? (p.cta || "Let's go! ▶") : 'Next ▶';
        $('s-skip').classList.toggle('hidden', panels.length === 1);
      };
      const done = () => {
        $('s-next').onclick = null;
        $('s-skip').onclick = null;
        resolve();
      };
      $('s-next').onclick = () => (++i >= panels.length ? done() : render());
      $('s-skip').onclick = done;
      render();
      this.show('screen-story');
    });
  }

  renderBoard(top, me) {
    const list = $('b-list');
    list.replaceChildren();
    top.forEach((row) => {
      const li = document.createElement('li');
      const icon = /mobile/.test(row.device) ? '📱' : /tablet/.test(row.device) ? '📲' : '💻';
      li.textContent = `${row.name} ${icon} `;
      const pts = document.createElement('span');
      pts.className = 'pts';
      pts.textContent = row.score;
      li.appendChild(pts);
      list.appendChild(li);
    });
    $('b-msg').textContent = me ? `Your device is #${me.rank} with ${me.score}` : top.length ? '' : 'No scores yet — be the first Gedi!';
  }
}
