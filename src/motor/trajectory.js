// Minimum-jerk interpolation, the standard description of smooth
// point-to-point reaching (Flash & Hogan, 1985).

export function minJerk(tau) {
  if (tau <= 0) return 0;
  if (tau >= 1) return 1;
  const t3 = tau * tau * tau;
  return 10 * t3 - 15 * t3 * tau + 6 * t3 * tau * tau;
}

export function lerpJoints(from, to, u) {
  const out = {};
  for (const id of Object.keys(to)) {
    const a = from[id] ?? to[id];
    out[id] = a + (to[id] - a) * u;
  }
  return out;
}

// Movement time grows with distance, in the spirit of Fitts' law. Distance
// in metres, duration in seconds.
export function reachDuration(distance, speed = 1) {
  const mm = distance * 1000;
  const T = 0.03 + 0.0025 * mm;
  return Math.min(0.35, Math.max(0.03, T)) / speed;
}
