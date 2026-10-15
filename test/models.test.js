import { describe, it, expect } from 'vitest';
import { Simulator } from '../src/sim/simulator.js';
import { computeMetrics } from '../src/sim/metrics.js';
import { MODELS } from '../src/cognitive/registry.js';

const TEXT = 'the quick brown fox jumps over the lazy dog';

describe.each(MODELS.map((M) => [M.id, M]))('%s', (id) => {
  it('types the text through the hands with no motor noise', () => {
    const sim = new Simulator({ modelId: id, text: TEXT, seed: 11, motorParams: { noise: 0 } }).runToEnd(120);
    const m = computeMetrics(sim);
    expect(sim.stalled).toBe(false);
    expect(sim.done).toBe(true);
    expect(m.keystrokes).toBeGreaterThanOrEqual(sim.targetKeys.length - 2);
    expect(m.accuracy).toBeGreaterThan(0.9);
    expect(m.meanIki).toBeGreaterThan(60);
    expect(m.meanIki).toBeLessThan(600);
  }, 60000);

  it('is reproducible for a given seed', () => {
    const a = new Simulator({ modelId: id, text: 'hello world', seed: 5 }).runToEnd(60);
    const b = new Simulator({ modelId: id, text: 'hello world', seed: 5 }).runToEnd(60);
    expect(a.log.map((e) => [e.key, e.time])).toEqual(b.log.map((e) => [e.key, e.time]));
  }, 60000);

  it('exposes parameter specs with defaults inside their ranges', () => {
    const M = MODELS.find((m) => m.id === id);
    for (const [name, spec] of Object.entries(M.params)) {
      expect(spec.default, name).toBeGreaterThanOrEqual(spec.min);
      expect(spec.default, name).toBeLessThanOrEqual(spec.max);
      expect(typeof spec.label).toBe('string');
    }
  });
});
