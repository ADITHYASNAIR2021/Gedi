// Local persistence: best scores, run stats, settings.

const KEY = import.meta.env?.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('inspect')
  ? 'gedi.save.qa' : 'gedi.save.v1';

const DEFAULTS = {
  best: 0,
  bestDistance: 0,
  bestChapter: 0,
  runs: 0,
  elephants: 0,
  name: '',
  seenIntro: false,
  settings: { sound: true, music: true, voice: true, theri: true },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const data = JSON.parse(raw);
    return { ...structuredClone(DEFAULTS), ...data, settings: { ...DEFAULTS.settings, ...data.settings } };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

const state = load();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage blocked */ }
}

export const save = {
  get data() { return state; },

  recordRun({ score, distance, chapter, elephants }) {
    state.runs += 1;
    state.elephants += elephants;
    const isBest = score > state.best;
    if (isBest) state.best = score;
    state.bestDistance = Math.max(state.bestDistance, distance);
    state.bestChapter = Math.max(state.bestChapter, chapter);
    persist();
    return isBest;
  },

  mergeServerBest(score) {
    if (Number.isFinite(score) && score > state.best) {
      state.best = score;
      persist();
    }
  },

  set(key, value) {
    state[key] = value;
    persist();
  },

  setSetting(key, value) {
    state.settings[key] = value;
    persist();
  },
};
