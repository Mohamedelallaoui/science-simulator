/**
 * Projectile Motion Physics Engine
 * Always returns exactly ~200 trajectory points regardless of velocity/time.
 */

export function runSimulation({ v0, angle, y0, g, dt, airResistance, mass }) {
  const rad = (angle * Math.PI) / 180;
  const vx0 = v0 * Math.cos(rad);
  const vy0 = v0 * Math.sin(rad);
  const k = airResistance ? 0.1 * mass : 0;

  let x = 0, y = y0, vx = vx0, vy = vy0, t = 0;
  let maxHeight = y0;

  // First pass: collect ALL raw points
  const raw = [{ x, y, t }];
  const MAX_STEPS = 100000;
  let steps = 0;

  while (y >= 0 && steps < MAX_STEPS) {
    const ax = -(k / mass) * vx;
    const ay = -g - (k / mass) * vy;
    vx += ax * dt;
    vy += ay * dt;
    x  += vx * dt;
    y  += vy * dt;
    t  += dt;
    steps++;
    if (y > maxHeight) maxHeight = y;
    raw.push({ x: Math.max(0, x), y: Math.max(0, y), t });
  }

  // Second pass: downsample to exactly 200 evenly-spaced points
  const TARGET = 200;
  const trajectory = [];
  for (let i = 0; i < TARGET; i++) {
    const idx = Math.round((i / (TARGET - 1)) * (raw.length - 1));
    trajectory.push(raw[idx]);
  }

  const last = raw[raw.length - 1];
  const impactVelocity = Math.sqrt(vx * vx + vy * vy);

  return {
    trajectory,
    timeOfFlight: last.t,
    maxHeight,
    range: last.x,
    impactVelocity,
  };
}