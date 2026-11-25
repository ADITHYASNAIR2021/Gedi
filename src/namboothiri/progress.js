import { NIGHTS } from './game.js';

const KEY = 'namboothiri.save.v1';
const nonnegative = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;

export function loadProgress() {
  let data;
  try { data = JSON.parse(localStorage.getItem(KEY)); } catch { /* Start fresh if storage is unavailable. */ }
  return {
    unlocked: Math.min(NIGHTS.length - 1, nonnegative(data?.unlocked)),
    bests: NIGHTS.map((_, i) => nonnegative(data?.bests?.[i])),
  };
}

export function recordNight(run, session) {
  const stored = loadProgress();
  const progress = {
    unlocked: Math.max(stored.unlocked, session.unlocked),
    bests: stored.bests.map((score, i) => Math.max(score, session.bests[i])),
  };
  const best = run.score > progress.bests[run.level];
  if (best) progress.bests[run.level] = run.score;
  if (run.outcome === 'cleared') progress.unlocked = Math.max(progress.unlocked, Math.min(NIGHTS.length - 1, run.level + 1));
  try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* This visit can still continue. */ }
  return { progress, best };
}
