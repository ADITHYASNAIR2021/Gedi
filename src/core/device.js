// Device profile + persistent device ID (no invasive fingerprinting).

const ID_KEY = 'gedi.deviceId';

function detectOS(ua) {
  if (/iPhone|iPod/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/.test(ua)) return 'Mac';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

function detectBrowser(ua) {
  if (/SamsungBrowser/.test(ua)) return 'Samsung';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Firefox|FxiOS/.test(ua)) return 'Firefox';
  if (/CriOS|Chrome/.test(ua)) return 'Chrome';
  if (/Safari/.test(ua)) return 'Safari';
  return 'Browser';
}

function detectType(ua, os) {
  const uaMobile = navigator.userAgentData?.mobile;
  const minSide = Math.min(screen.width, screen.height);
  if (os === 'iPad' || /Tablet/.test(ua) || (os === 'Android' && !/Mobile/.test(ua))) return 'tablet';
  if (uaMobile || os === 'iPhone' || /Mobile/.test(ua)) return 'mobile';
  if (navigator.maxTouchPoints > 1 && minSide < 900) return 'tablet';
  return 'desktop';
}

function readCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name, value) {
  const maxAge = 60 * 60 * 24 * 400;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

function getDeviceId() {
  let id = null;
  try { id = localStorage.getItem(ID_KEY); } catch { /* storage blocked */ }
  if (!id) { try { id = readCookie('gedi_did'); } catch { /* cookies blocked */ } }
  if (!id || !/^[a-zA-Z0-9-]{8,64}$/.test(id)) id = newId();
  try { localStorage.setItem(ID_KEY, id); } catch { /* storage blocked */ }
  try { writeCookie('gedi_did', id); } catch { /* cookies blocked */ }
  return id;
}

function guessGpuTier(type) {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  if (type === 'desktop') return cores >= 4 ? 'high' : 'mid';
  if (cores >= 8 && mem >= 6) return 'mid';
  return 'low';
}

export function getDeviceProfile() {
  const ua = navigator.userAgent;
  const os = detectOS(ua);
  const browser = detectBrowser(ua);
  const type = detectType(ua, os);
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const tier = guessGpuTier(type);
  const quality = {
    pixelRatio: Math.min(window.devicePixelRatio || 1, tier === 'high' ? 1.75 : tier === 'mid' ? 1.35 : 1.15),
    shadows: tier === 'high',
    antialias: tier !== 'low',
    propDensity: tier === 'low' ? 0.5 : tier === 'mid' ? 0.75 : 1,
  };
  const icon = type === 'desktop' ? '💻' : type === 'tablet' ? '📲' : '📱';
  return {
    id: getDeviceId(),
    type, os, browser, touch, tier, quality, icon,
    label: `${os} · ${browser}`,
    short: `${type}/${os}/${browser}`.slice(0, 40),
  };
}
