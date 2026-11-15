// Exact critically damped spring for constant targets, stable across frame rates.
export function spring(value, velocity, target, frequency, dt) {
  if (dt <= 0) return [value, velocity];
  const offset = value - target;
  const impulse = velocity + frequency * offset;
  const decay = Math.exp(-frequency * dt);
  return [target + (offset + impulse * dt) * decay, (velocity - frequency * impulse * dt) * decay];
}
