// Rumelhart & Norman (1982), "Simulating a skilled typist".
//
// A word schema activates keypress schemata for the next few letters in
// parallel. Each keypress schema inhibits the schemata for letters that
// follow it, producing a gradient of activation that encodes order. A
// keystroke is launched when its schema's activation crosses a threshold;
// when the key is pressed the schema is deactivated, releasing its
// inhibition on the letters after it. Because several schemata are active
// at once, fingers move toward upcoming keys before the current key is
// struck, and with noise a later letter can occasionally launch first,
// giving transposition errors.

import { SequencingModel, param } from './model.js';

export class RumelhartNormanModel extends SequencingModel {
  static id = 'rumelhart-norman';
  static label = 'Rumelhart & Norman (1982) activation schemata';
  static description =
    'Parallel keypress schemata with sequential inhibition. Launch on threshold; deactivate on press. Fingers are pulled toward every active letter.';
  static params = {
    rate: param(8, 1, 30, 0.5, 'Activation rate (1/s)'),
    inhibition: param(0.5, 0, 1, 0.05, 'Sequential inhibition'),
    threshold: param(0.75, 0.3, 1, 0.05, 'Launch threshold'),
    noise: param(0.25, 0, 1.5, 0.05, 'Activation noise'),
    window: param(4, 1, 8, 1, 'Letters active at once'),
    maxPending: param(2, 1, 4, 1, 'Keystrokes in flight'),
  };

  reset(keys) {
    super.reset(keys);
    const n = keys.length;
    this.a = new Float64Array(n);
    this.done = new Uint8Array(n);
    this.launched = new Uint8Array(n);
  }

  step(dt, feedback) {
    const { keys, a, done, launched, p } = this;
    const n = keys.length;
    for (const c of feedback.completed) {
      for (let i = 0; i < n; i++) {
        if (launched[i] && !done[i] && keys[i] === c.intended) {
          done[i] = 1;
          a[i] = 0;
          break;
        }
      }
    }
    let cursor = -1;
    for (let i = 0; i < n; i++) if (!done[i]) { cursor = i; break; }
    if (cursor < 0) return { activations: {}, launch: [], done: true };

    const window = [];
    for (let i = cursor; i < n && window.length < p.window; i++) if (!done[i]) window.push(i);

    let pending = 0;
    for (let i = 0; i < n; i++) if (launched[i] && !done[i]) pending++;

    const launch = [];
    const activations = {};
    const trace = [];
    const sqrtDt = Math.sqrt(dt);
    for (const i of window) {
      let inhibition = 0;
      for (const j of window) {
        if (j >= i) break;
        inhibition += a[j];
      }
      const da = p.rate * (1 - a[i] - p.inhibition * inhibition);
      a[i] = Math.min(1.5, Math.max(0, a[i] + da * dt + p.noise * sqrtDt * this.rng.gaussian()));
      if (!launched[i] && a[i] >= p.threshold && pending < p.maxPending) {
        launched[i] = 1;
        launch.push(keys[i]);
        pending++;
      }
      if (!launched[i]) {
        activations[keys[i]] = Math.max(activations[keys[i]] ?? 0, Math.min(1, a[i] / p.threshold));
      }
      trace.push({ index: i, key: keys[i], activation: a[i], launched: !!launched[i] });
    }
    return { activations, launch, done: false, trace: { cursor, items: trace } };
  }
}
