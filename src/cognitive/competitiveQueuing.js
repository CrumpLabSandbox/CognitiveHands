// Competitive queuing (Grossberg, 1978; Houghton, 1990; Bullock & Rhodes,
// 2003). A planning layer holds the upcoming items with a primacy gradient
// of activation; a competitive choice layer selects the most active item,
// which is output and then suppressed so the next can win. Noise in the
// competition yields anticipation and transposition errors with the
// classic pattern: nearby items swap more often than distant ones.

import { SequencingModel, param } from './model.js';

export class CompetitiveQueuingModel extends SequencingModel {
  static id = 'competitive-queuing';
  static label = 'Competitive queuing (Houghton 1990)';
  static description =
    'Primacy gradient over upcoming items; winner-take-all selection after a response-selection latency; selected items are suppressed.';
  static params = {
    rho: param(0.8, 0.3, 0.98, 0.02, 'Gradient decay per position'),
    noise: param(0.06, 0, 0.4, 0.01, 'Selection noise'),
    latency: param(0.1, 0, 0.5, 0.01, 'Selection latency (s)'),
    latencySd: param(0.02, 0, 0.2, 0.005, 'Latency variability (s)'),
    window: param(6, 1, 12, 1, 'Items in the plan'),
    maxPending: param(1, 1, 3, 1, 'Keystrokes in flight'),
  };

  reset(keys) {
    super.reset(keys);
    this.remaining = keys.map((_, i) => i);
    this.pending = 0;
    this.timer = this.p.latency;
  }

  step(dt, feedback) {
    const { p, keys } = this;
    this.pending = Math.max(0, this.pending - feedback.completed.length);
    if (this.remaining.length === 0) {
      return { activations: {}, launch: [], done: this.pending === 0 };
    }
    const launch = [];
    const candidates = this.remaining.slice(0, p.window);
    if (this.pending < p.maxPending) {
      this.timer -= dt;
      if (this.timer <= 0) {
        let best = -1;
        let bestScore = -Infinity;
        candidates.forEach((pos, k) => {
          const score = Math.pow(p.rho, k) + this.rng.gaussian(0, p.noise);
          if (score > bestScore) {
            bestScore = score;
            best = pos;
          }
        });
        this.remaining.splice(this.remaining.indexOf(best), 1);
        launch.push(keys[best]);
        this.pending++;
        this.timer = Math.max(0.005, p.latency + this.rng.gaussian(0, p.latencySd));
      }
    }
    const activations = {};
    this.remaining.slice(0, p.window).forEach((pos, k) => {
      const key = keys[pos];
      activations[key] = Math.max(activations[key] ?? 0, Math.pow(p.rho, k));
    });
    return {
      activations,
      launch,
      done: false,
      trace: { items: this.remaining.slice(0, p.window).map((pos, k) => ({ index: pos, key: keys[pos], activation: Math.pow(p.rho, k) })) },
    };
  }
}
