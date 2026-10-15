// Minerva 2 (Hintzman, 1984, 1986) as an instance model of the letter-to-
// keystroke mapping, in the spirit of instance theories of automaticity
// (Logan, 1988) and of Jamieson and colleagues' Minerva-based models of
// response time.
//
// Every typing experience leaves a trace: the letter to be typed, the
// letter before it, and the key that was pressed. To type a letter the
// model probes memory with the letter and its context; each trace is
// activated by the cube of its similarity to the probe; the echo (the
// activation-weighted sum of traces) says which key to press, and the echo
// intensity sets how long retrieval takes. More practice means more traces,
// a stronger echo and faster keystrokes. Weak or conflicting echoes yield
// slow, error-prone responses.
//
// This is a deliberately small starting point for exploring instance
// models here; see docs/models.md for extension ideas.

import { SequencingModel, param } from './model.js';

const START = '^';

export class Minerva2Model extends SequencingModel {
  static id = 'minerva2';
  static label = 'Minerva 2 instance model (Hintzman 1984)';
  static description =
    'Letter→key mapping retrieved from stored instances; echo intensity sets retrieval time, so practice speeds typing.';
  static params = {
    learningRate: param(0.7, 0.1, 1, 0.05, 'Encoding probability (L)'),
    practice: param(3, 0, 40, 1, 'Practice repetitions of the text'),
    noise: param(0.03, 0, 0.3, 0.01, 'Echo noise'),
    rtBase: param(0.06, 0, 0.4, 0.01, 'Retrieval time floor (s)'),
    rtScale: param(0.12, 0, 1, 0.01, 'Retrieval time scale (s)'),
    letterWeight: param(2, 0.5, 5, 0.5, 'Weight of letter vs. context'),
    learnOnline: param(1, 0, 1, 1, 'Store new traces while typing'),
  };

  reset(keys) {
    super.reset(keys);
    this.traces = [];
    for (let r = 0; r < this.p.practice; r++) {
      keys.forEach((k, i) => this.encode(k, i > 0 ? keys[i - 1] : START, k));
    }
    this.cursor = 0;
    this.pending = 0;
    this.launchedQueue = [];
    this.selection = keys.length ? this.retrieve(0) : null;
    this.timer = this.selection ? this.selection.rt : 0;
    this.lastIntensity = this.selection ? this.selection.intensity : 0;
  }

  encode(letter, prev, response) {
    const L = this.p.learningRate;
    this.traces.push({
      letter: this.rng.next() < L ? letter : null,
      prev: this.rng.next() < L ? prev : null,
      response: this.rng.next() < L ? response : null,
    });
  }

  retrieve(i) {
    const { p, keys } = this;
    const letter = keys[i];
    const prev = i > 0 ? keys[i - 1] : START;
    const echo = new Map();
    let intensity = 0;
    const denom = p.letterWeight + 1;
    for (const t of this.traces) {
      const s = ((t.letter === letter ? p.letterWeight : 0) + (t.prev === prev ? 1 : 0)) / denom;
      if (s === 0) continue;
      const a = s * s * s;
      intensity += a;
      if (t.response) echo.set(t.response, (echo.get(t.response) ?? 0) + a);
    }
    let key = letter;
    let best = -Infinity;
    for (const [k, v] of echo) {
      const score = v / Math.max(intensity, 1e-9) + this.rng.gaussian(0, p.noise);
      if (score > best) {
        best = score;
        key = k;
      }
    }
    const rt = p.rtBase + p.rtScale / (1 + intensity);
    return { key, rt, intensity };
  }

  step(dt, feedback) {
    const { p, keys } = this;
    for (const c of feedback.completed) {
      this.pending = Math.max(0, this.pending - 1);
      // Learning while typing: the finished keystroke becomes a new trace.
      const rec = this.launchedQueue.shift();
      if (p.learnOnline && rec) this.encode(keys[rec.position], rec.position > 0 ? keys[rec.position - 1] : START, c.intended);
    }
    if (this.cursor >= keys.length) {
      return { activations: {}, launch: [], done: this.pending === 0 };
    }
    const launch = [];
    if (this.pending === 0) {
      this.timer -= dt;
      if (this.timer <= 0) {
        launch.push(this.selection.key);
        this.launchedQueue.push({ position: this.cursor });
        this.pending = 1;
        this.cursor++;
        if (this.cursor < keys.length) {
          this.selection = this.retrieve(this.cursor);
          this.timer = this.selection.rt;
          this.lastIntensity = this.selection.intensity;
        }
      }
    }
    const activations = {};
    if (this.cursor < keys.length && this.selection) {
      activations[this.selection.key] = 1;
      if (this.cursor + 1 < keys.length) activations[keys[this.cursor + 1]] = Math.max(activations[keys[this.cursor + 1]] ?? 0, 0.3);
    }
    return {
      activations,
      launch,
      done: false,
      trace: { traces: this.traces.length, intensity: this.lastIntensity, nextKey: this.selection?.key, nextRt: this.selection?.rt },
    };
  }
}
