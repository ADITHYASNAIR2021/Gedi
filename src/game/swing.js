// Point-mass swing physics with a flexible rope (trunk/tail) constraint.
// Momentum carries between swings; a gentle energy-targeted pump keeps the swing alive.

// Swing feel knobs (mutable for live tuning via window.__gedi.tuning)
export const TUNING = {
  gravity: 24,
  grabRadius: 6.8,
  minLen: 1.7,
  maxLen: 6,
  groundClear: 2.0,
  reel: 8,
  reelFast: 28,
  catchTime: 0.24,
  swingAngle: 1.1, // radians: the amplitude the elephant keeps Gedi swinging at
  pump: 13,
  minSwing: 10, // m/s at the bottom of the arc, so short ropes still launch properly
  grabBoost: 1.1,
  minGrabSpeed: 8.5,
  maxSpeed: 27,
  drag: 0.03,
};

// A release counts as "perfect" when Gedi leaves fast, forward and upward.
export function perfectRelease(v) {
  const speed = Math.hypot(v.x, v.y);
  const angle = (Math.atan2(v.y, v.x) * 180) / Math.PI;
  return v.x > 4 && speed > 7.5 && angle > 20 && angle < 70;
}

export function launchVelocity(v, beat = false, assist = 1) {
  const boost = (perfectRelease(v) ? 1.08 : 1) * (beat ? 1.06 : 1) * assist;
  const scale = Math.min(boost, TUNING.maxSpeed / (Math.hypot(v.x, v.y) || 1));
  return { x: v.x * scale, y: v.y * scale };
}

function fly(p, v, dt) {
  const T = TUNING;
  const decay = Math.exp(-T.drag * dt);
  const travel = T.drag > 0 ? -Math.expm1(-T.drag * dt) / T.drag : dt;
  p.x += v.x * travel;
  p.y += v.y * travel - (T.drag > 0 ? T.gravity / T.drag * (dt - travel) : 0.5 * T.gravity * dt * dt);
  v.x *= decay;
  v.y = v.y * decay - T.gravity * travel;
  const speed = Math.hypot(v.x, v.y);
  if (speed > T.maxSpeed) { v.x *= T.maxSpeed / speed; v.y *= T.maxSpeed / speed; }
}

export class Swinger {
  constructor() {
    this.pos = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
    this.anchor = null; // { pos: Vector3, ... }
    this.len = 0;
    this.targetLen = 0;
    this.catchRemaining = 0;
  }

  reset(x, y) {
    this.pos.x = x;
    this.pos.y = y;
    this.vel.x = 0;
    this.vel.y = 0;
    this.anchor = null;
    this.catchRemaining = 0;
  }

  attach(anchor) {
    const T = TUNING;
    const dx = this.pos.x - anchor.pos.x;
    const dy = this.pos.y - anchor.pos.y;
    const d = Math.hypot(dx, dy) || 1e-4;
    this.anchor = anchor;
    this.len = Math.max(d, T.minLen);
    const clearance = Math.max(T.minLen, anchor.pos.y - T.groundClear);
    this.targetLen = Math.min(this.len, T.maxLen, clearance);
    this.catchRemaining = T.catchTime;
    this.catchSpeed = null;
    if (dy < -0.25 * d) {
      // hanging below the anchor: the trunk flings Gedi along the forward (counter-clockwise) arc
      const tx = -dy / d;
      const ty = dx / d;
      const vt = this.vel.x * tx + this.vel.y * ty;
      this.catchSpeed = Math.max(vt * T.grabBoost, anchor.el?.personality?.speed || T.minGrabSpeed);
    } else if (this.vel.x < 5) {
      this.catchSpeed = 5;
    }
  }

  detach() {
    this.anchor = null;
    this.catchRemaining = 0;
  }

  step(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const T = TUNING;
    const p = this.pos;
    const v = this.vel;
    if (!this.anchor) {
      // Exact integration of gravity + linear air resistance. The preview uses
      // the same equations, independent of rendering frame rate.
      fly(p, v, dt);
      return;
    }
    v.y -= T.gravity * dt;

    if (this.anchor) {
      const a = this.anchor.pos;
      const av = this.anchor.vel || { x: 0, y: 0 };
      let dx = p.x - a.x;
      let dy = p.y - a.y;
      let d = Math.hypot(dx, dy) || 1e-4;
      const tx = -dy / d;
      const ty = dx / d;
      const catchK = 1 - Math.min(1, this.catchRemaining / T.catchTime);
      if (this.catchRemaining > 0) {
        this.catchRemaining = Math.max(0, this.catchRemaining - dt);
        if (this.catchSpeed !== null) {
          const vt = v.x * tx + v.y * ty;
          const assistance = Math.max(0, this.catchSpeed - vt) * (1 - Math.exp(-dt * 12));
          v.x += tx * assistance; v.y += ty * assistance;
        }
      }
      const clearance = Math.max(T.minLen, a.y - T.groundClear);
      if (this.targetLen > clearance) this.targetLen = clearance;
      const taut = d > this.len * 0.92;

      if (taut && dy < 0) {
        // keep the swing at a steady, readable amplitude (never a dead hang, never a wild spin)
        const vt = v.x * tx + v.y * ty;
        const height = p.y - (a.y - this.len);
        const energy = 0.5 * (v.x * v.x + v.y * v.y) + T.gravity * height;
        const want = Math.max(T.gravity * this.len * (1 - Math.cos(T.swingAngle)), 0.5 * T.minSwing * T.minSwing);
        if (energy < want) {
          const dir = vt < -1 ? -0.6 : 1;
          const pump = T.pump * (this.anchor.el?.personality?.pump || 1) * (0.65 + 0.35 * catchK);
          v.x += tx * dir * pump * dt;
          v.y += ty * dir * pump * dt;
        }
      }

      if (this.len > this.targetLen) {
        // reel in; snap fast when the arc would scrape the ground
        const fast = this.len > clearance + 0.05;
        const reelSpeed = (fast ? 17 : T.reel) * (0.3 + 0.7 * catchK);
        const newLen = Math.max(this.targetLen, this.len - reelSpeed * dt);
        if (!fast && taut) {
          const vt = v.x * tx + v.y * ty;
          const boost = (this.len / newLen - 1) * vt;
          v.x += tx * boost;
          v.y += ty * boost;
        }
        this.len = newLen;
      }

      p.x += v.x * dt;
      p.y += v.y * dt;
      dx = p.x - a.x;
      dy = p.y - a.y;
      d = Math.hypot(dx, dy) || 1e-4;
      if (d > this.len) {
        const ux = dx / d;
        const uy = dy / d;
        p.x = a.x + ux * this.len;
        p.y = a.y + uy * this.len;
        const radial = (v.x - av.x) * ux + (v.y - av.y) * uy;
        if (radial > 0) {
          v.x -= radial * ux;
          v.y -= radial * uy;
        }
      }
    } else {
      p.x += v.x * dt;
      p.y += v.y * dt;
    }

    const k = Math.exp(-T.drag * dt);
    v.x *= k;
    v.y *= k;
    const s = Math.hypot(v.x, v.y);
    if (s > T.maxSpeed) {
      v.x *= T.maxSpeed / s;
      v.y *= T.maxSpeed / s;
    }
  }

  // Ballistic preview of where Gedi would fly if released right now.
  predict(out, step, beat = false, assist = 1) {
    const v = launchVelocity(this.vel, beat, assist);
    const p = { ...this.pos };
    for (let i = 0; i < out.length; i++) {
      let remaining = step;
      while (remaining > 1e-10) {
        const dt = Math.min(remaining, 1 / 120);
        fly(p, v, dt);
        remaining -= dt;
      }
      out[i].x = p.x;
      out[i].y = p.y;
    }
    return out;
  }
}
