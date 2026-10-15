import { Simulator } from '../src/sim/simulator.js';
import { computeMetrics } from '../src/sim/metrics.js';
import { MODELS } from '../src/cognitive/registry.js';
import { FINGERS } from '../src/body/anatomy.js';
import { HOME_KEYS } from '../src/motor/fingering.js';

const text = process.argv[2] ?? 'the quick brown fox jumps over the lazy dog';
const sim = new Simulator({ modelId: 'competitive-queuing', text, seed: 3 });
// Rest geometry
for (const side of ['left', 'right']) {
  const tips = sim.hands[side].tips();
  for (const f of FINGERS) {
    const t = tips[f];
    const k = sim.keyboard.keyAt(t.x, t.z);
    console.log(side, f, t.toArray().map((v) => (v * 1000).toFixed(1)).join(','), 'over', k?.id, 'home', HOME_KEYS[side][f]);
  }
  console.log(side, 'base', sim.hands[side].basePosition.toArray().map((v) => (v * 1000).toFixed(1)).join(','));
}
// IK check for every typable key
import { solveFingerIK } from '../src/motor/ik.js';
import { fingerFor } from '../src/motor/fingering.js';
import { REST_POSE } from '../src/body/anatomy.js';
import { Vector3 } from 'three';
let worst = 0;
for (const key of sim.keyboard.keys) {
  const a = fingerFor(key.id);
  if (!a) continue;
  const target = key.center.clone();
  target.y += 0.008;
  const sol = solveFingerIK(sim.hands[a.hand], a.finger, target, { pose: { ...REST_POSE }, offset: new Vector3() });
  if (sol.error > worst) worst = sol.error;
  if (sol.error > 0.002) console.log('IK poor', key.id, a, (sol.error * 1000).toFixed(2), 'mm', sol.offset.toArray().map((v) => (v * 1000).toFixed(1)));
}
console.log('worst IK error mm', (worst * 1000).toFixed(2));

for (const M of MODELS) {
  for (const noise of [0, 1]) {
    const s = new Simulator({ modelId: M.id, text, seed: 7, motorParams: { noise } }).runToEnd(120);
    const m = computeMetrics(s);
    console.log(M.id, 'noise', noise, 'typed:', s.typedKeys().map((k) => (k === 'space' ? ' ' : k)).join(''), '| stalled', s.stalled, 'time', s.time.toFixed(2));
    console.log('  wpm', m.wpm.toFixed(0), 'meanIKI', m.meanIki.toFixed(0), Object.entries(m.byClass).map(([c, v]) => `${c}: ${v.mean.toFixed(0)} (n=${v.n})`).join(' | '));
    console.log('  errors', JSON.stringify(m.errors), 'misses', m.misses, 'accidental', m.accidental, 'wordInitial', m.wordInitialMean.toFixed(0), 'within', m.withinWordMean.toFixed(0));
  }
}
