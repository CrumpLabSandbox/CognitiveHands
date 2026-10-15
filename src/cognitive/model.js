// Interface every cognitive model of action sequencing implements.
//
// A model is given the sequence of keys to type (reset) and is then stepped
// in simulated time. On each step it returns:
//   activations: { [key]: 0..1 }  how strongly each upcoming key is being
//                                  prepared; the motor layer moves idle
//                                  fingers toward activated keys early
//   launch:      [key, ...]        keystrokes to commit now
//   done:        boolean           nothing left to type
//   trace:       anything          optional state for display
// and receives feedback: { time, completed: [{ intended, actual, hand,
// finger, time, latency }], pending } where `completed` lists keystrokes
// whose press just bottomed out (actual is null if the finger missed).
//
// Models should be swappable: the same body is driven by any of them.

export class SequencingModel {
  static id = 'base';
  static label = 'Base model';
  static description = '';
  static params = {};

  constructor(params = {}, rng) {
    const defaults = Object.fromEntries(
      Object.entries(this.constructor.params).map(([k, v]) => [k, v.default]),
    );
    this.p = { ...defaults, ...params };
    this.rng = rng;
    this.keys = [];
  }

  reset(keys) {
    this.keys = keys;
  }

  // eslint-disable-next-line no-unused-vars
  step(dt, feedback) {
    return { activations: {}, launch: [], done: true };
  }
}

export function param(def, min, max, step, label) {
  return { default: def, min, max, step, label };
}
