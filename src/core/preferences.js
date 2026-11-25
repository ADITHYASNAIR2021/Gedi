const DEFAULTS = { sound: true, music: true, voice: true, theri: true };
const MAIN_SAVE = 'gedi.save.v1';

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)); }
  catch { return null; }
}

export function createPreferences(legacyKey = MAIN_SAVE) {
  const key = legacyKey === MAIN_SAVE ? 'gedi.preferences.v1' : `${legacyKey}.preferences`;
  const settings = { ...DEFAULTS };
  const load = () => {
    const stored = read(key)?.settings ?? read(legacyKey)?.settings;
    if (!stored) return;
    for (const name of Object.keys(DEFAULTS)) {
      settings[name] = typeof stored?.[name] === 'boolean' ? stored[name] : DEFAULTS[name];
    }
  };
  load();

  return {
    settings,
    refresh: load,
    set(name, value) {
      load();
      settings[name] = value;
      try { localStorage.setItem(key, JSON.stringify({ settings })); }
      catch { /* Controls still work for this visit when storage is unavailable. */ }
    },
  };
}
