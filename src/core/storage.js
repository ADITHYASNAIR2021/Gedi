// Local persistence: best scores, run stats, settings.
import { AANAS } from '../game/aanas.js';
import { createPreferences } from './preferences.js';

const KEY = import.meta.env?.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('inspect')
  ? 'gedi.save.qa' : 'gedi.save.v1';
const preferences = createPreferences(KEY);

const DEFAULTS = {
  best: 0,
  bestDistance: 0,
  bestChapter: 0,
  encoreUnlocked: false,
  runs: 0,
  elephants: 0,
  aanas: {},
  name: '',
  seenIntro: false,
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const data = JSON.parse(raw);
    const known = Object.fromEntries(AANAS.filter(aana => data.aanas?.[aana.id] === true).map(aana => [aana.id, true]));
    return { ...structuredClone(DEFAULTS), ...data, aanas: known };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

const state = load();
state.settings = preferences.settings;

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

  discoverAana(id) {
    if (state.aanas[id] || !AANAS.some(aana => aana.id === id)) return false;
    state.aanas[id] = true;
    persist();
    return true;
  },

  set(key, value) {
    state[key] = value;
    persist();
  },

  setSetting(key, value) {
    preferences.set(key, value);
    persist();
  },

  refreshSettings() { preferences.refresh(); },
};
