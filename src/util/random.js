// Seedable random numbers so a run can be reproduced exactly.
// mulberry32 for uniforms, Box–Muller for Gaussians.

export function makeRng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gaussian = (mean = 0, sd = 1) => {
    let u = 0;
    while (u === 0) u = next();
    const v = next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return { next, gaussian, seed };
}
