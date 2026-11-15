const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const LB_KEY = 'gedi:lb';
const PLAYER_KEY = (id) => `gedi:p:${id}`;
const RATE_KEY = (id) => `gedi:rl:${id}`;
const TOP_N = 20;
const MAX_SCORE = 2_000_000;

const ID_RE = /^[a-zA-Z0-9-]{8,64}$/;

async function redis(commands) {
  const res = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const out = await res.json();
  return out.map((r) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

function cleanName(raw) {
  const name = String(raw ?? '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
  return name || 'Anonymous Aana Fan';
}

function cleanDevice(raw) {
  return String(raw ?? '').replace(/[^a-zA-Z0-9/ ._-]/g, '').slice(0, 40);
}

function toInt(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  return i < min || i > max ? null : i;
}

async function getTop() {
  const [flat] = await redis([['ZREVRANGE', LB_KEY, '0', String(TOP_N - 1), 'WITHSCORES']]);
  const ids = [];
  for (let i = 0; i < flat.length; i += 2) ids.push({ id: flat[i], score: Number(flat[i + 1]) });
  if (!ids.length) return [];
  const metas = await redis(ids.map(({ id }) => ['HMGET', PLAYER_KEY(id), 'name', 'device', 'chapter']));
  return ids.map(({ score }, i) => {
    const [name, device, chapter] = metas[i] || [];
    return { name: name || 'Anonymous', device: device || '', chapter: Number(chapter) || 0, score };
  });
}

async function getMe(id) {
  const [score, rank] = await redis([
    ['ZSCORE', LB_KEY, id],
    ['ZREVRANK', LB_KEY, id],
  ]);
  if (score === null) return null;
  return { score: Number(score), rank: rank === null ? null : Number(rank) + 1 };
}

async function handleGet(req, res) {
  const id = typeof req.query?.id === 'string' && ID_RE.test(req.query.id) ? req.query.id : null;
  const [top, me] = await Promise.all([getTop(), id ? getMe(id) : null]);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ configured: true, top, me });
}

async function handlePost(req, res) {
  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { return res.status(400).json({ ok: false, error: 'invalid json' }); }
  }
  const deviceId = typeof body.deviceId === 'string' && ID_RE.test(body.deviceId) ? body.deviceId : null;
  const score = toInt(body.score, 0, MAX_SCORE);
  const duration = toInt(body.duration, 1, 60 * 60 * 6);
  const chapter = toInt(body.chapter, 0, 6) ?? 0;
  const distance = toInt(body.distance, 0, 1_000_000) ?? 0;
  if (!deviceId || score === null || duration === null) {
    return res.status(400).json({ ok: false, error: 'invalid payload' });
  }
  if (score > 60 * duration + 500) {
    return res.status(422).json({ ok: false, error: 'implausible score' });
  }

  const [rl] = await redis([['SET', RATE_KEY(deviceId), '1', 'NX', 'EX', '5']]);
  if (rl !== 'OK') return res.status(429).json({ ok: false, error: 'slow down' });

  const name = cleanName(body.name);
  const device = cleanDevice(body.device);
  const prev = await redis([['ZSCORE', LB_KEY, deviceId]]);
  const improved = prev[0] === null || score > Number(prev[0]);
  const cmds = [['ZADD', LB_KEY, 'GT', String(score), deviceId]];
  const meta = ['HSET', PLAYER_KEY(deviceId), 'name', name];
  if (device) meta.push('device', device);
  if (improved) meta.push('chapter', String(chapter), 'distance', String(distance));
  cmds.push(meta);
  cmds.push(['ZREVRANK', LB_KEY, deviceId], ['ZSCORE', LB_KEY, deviceId]);
  const out = await redis(cmds);
  return res.status(200).json({ ok: true, improved, rank: Number(out[2]) + 1, best: Number(out[3]) });
}

export default async function handler(req, res) {
  if (!URL_ || !TOKEN) return res.status(503).json({ configured: false, top: [] });
  try {
    if (req.method === 'GET') return await handleGet(req, res);
    if (req.method === 'POST') return await handlePost(req, res);
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method not allowed' });
  } catch (err) {
    console.error('scores api error', err);
    return res.status(500).json({ ok: false, error: 'server error' });
  }
}
