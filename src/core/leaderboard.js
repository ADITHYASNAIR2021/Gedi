// Client for the /api/scores Vercel function. Fails soft: the game works offline.

const ENDPOINT = '/api/scores';

async function request(url, options) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: {} };
  } finally {
    clearTimeout(timer);
  }
}

export const leaderboard = {
  configured: null,

  async fetchTop(deviceId) {
    const { ok, body } = await request(`${ENDPOINT}?id=${encodeURIComponent(deviceId)}`);
    this.configured = ok && body.configured === true;
    if (!this.configured) return { top: [], me: null };
    return { top: body.top || [], me: body.me || null };
  },

  async submit({ deviceId, name, score, distance, chapter, duration, device }) {
    const { ok, status, body } = await request(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, name, score, distance, chapter, duration, device }),
    });
    if (status === 503) this.configured = false;
    return ok ? body : { ok: false, error: body.error || 'offline' };
  },
};
