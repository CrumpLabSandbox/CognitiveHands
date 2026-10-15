// Hierarchical two-loop model of typing (Logan & Crump, 2011).
//
// An outer loop works at the level of words: it reads the text and hands
// one word at a time to the inner loop, with a retrieval latency per word.
// The inner loop translates a word into keystrokes with its own, faster
// timing (implemented here as a competitive queue over the word's letters).
// The outer loop may begin preparing the next word while the inner loop
// is finishing the current one (lookahead). When the next word is not
// ready in time, the first keystroke of the word is delayed, giving the
// word-initial slowing seen in skilled typists.

import { SequencingModel, param } from './model.js';

export class HierarchicalTwoLoopModel extends SequencingModel {
  static id = 'hierarchical-two-loop';
  static label = 'Hierarchical outer/inner loop (Logan & Crump 2011)';
  static description =
    'Outer loop delivers words with a retrieval latency; inner loop types each word as a competitive queue over its letters.';
  static params = {
    outerLatency: param(0.15, 0, 0.6, 0.01, 'Word retrieval latency (s)'),
    lookahead: param(2, 0, 6, 1, 'Letters left when next word is requested'),
    innerLatency: param(0.07, 0, 0.4, 0.005, 'Inner-loop latency (s)'),
    innerLatencySd: param(0.015, 0, 0.1, 0.005, 'Inner latency variability (s)'),
    innerNoise: param(0.05, 0, 0.4, 0.01, 'Inner selection noise'),
    rho: param(0.75, 0.3, 0.98, 0.02, 'Inner gradient decay'),
  };

  reset(keys) {
    super.reset(keys);
    this.words = [];
    let current = [];
    keys.forEach((k, i) => {
      current.push(i);
      if (k === 'space' || k === 'enter') {
        this.words.push(current);
        current = [];
      }
    });
    if (current.length) this.words.push(current);
    this.wordIdx = 0;
    this.current = null;
    this.nextReady = false;
    this.outerTimer = this.p.outerLatency;
    this.pending = 0;
    this.innerTimer = this.p.innerLatency;
  }

  step(dt, feedback) {
    const { p, keys } = this;
    this.pending = Math.max(0, this.pending - feedback.completed.length);
    const hasNext = this.wordIdx < this.words.length;
    const currentDone = !this.current || (this.current.remaining.length === 0 && this.pending === 0);

    // Outer loop: fetch the next word when the inner loop is nearly done.
    if (!this.nextReady && hasNext) {
      const left = this.current ? this.current.remaining.length + this.pending : 0;
      if (!this.current || left <= p.lookahead) {
        this.outerTimer -= dt;
        if (this.outerTimer <= 0) this.nextReady = true;
      }
    }
    if ((!this.current || this.current.remaining.length === 0) && this.nextReady) {
      this.current = { remaining: this.words[this.wordIdx].slice() };
      this.wordIdx++;
      this.nextReady = false;
      this.outerTimer = p.outerLatency;
      this.innerTimer = p.innerLatency;
    }
    if (!hasNext && currentDone) return { activations: {}, launch: [], done: true };

    const launch = [];
    const activations = {};
    if (this.current && this.current.remaining.length) {
      const rem = this.current.remaining;
      if (this.pending === 0) {
        this.innerTimer -= dt;
        if (this.innerTimer <= 0) {
          let best = -1;
          let bestScore = -Infinity;
          rem.forEach((pos, k) => {
            const score = Math.pow(p.rho, k) + this.rng.gaussian(0, p.innerNoise);
            if (score > bestScore) {
              bestScore = score;
              best = pos;
            }
          });
          rem.splice(rem.indexOf(best), 1);
          launch.push(keys[best]);
          this.pending = 1;
          this.innerTimer = Math.max(0.005, p.innerLatency + this.rng.gaussian(0, p.innerLatencySd));
        }
      }
      rem.forEach((pos, k) => {
        activations[keys[pos]] = Math.max(activations[keys[pos]] ?? 0, Math.pow(p.rho, k));
      });
    }
    if (this.nextReady && this.wordIdx < this.words.length) {
      const first = keys[this.words[this.wordIdx][0]];
      activations[first] = Math.max(activations[first] ?? 0, 0.3);
    }
    return {
      activations,
      launch,
      done: false,
      trace: {
        word: this.current ? this.current.remaining.map((i) => keys[i]).join('') : '',
        nextReady: this.nextReady,
        wordIndex: this.wordIdx,
      },
    };
  }
}
