// Keystroke statistics that can be compared with human typing data.

import { transitionClass, TRANSITION_CLASSES, fingerFor } from '../motor/fingering.js';
import { Keyboard } from '../instrument/keyboard.js';

// Approximate inter-keystroke intervals (ms) for skilled typists, assembled
// from Salthouse (1986), Logan & Crump (2011) and related reports. These are
// placeholders to orient the eye; they should be replaced by estimates from
// the Typing Science Platform.
export const HUMAN_REFERENCE = {
  'alternate hand': [130, 170],
  'same hand, different finger': [170, 210],
  'same finger, different key': [210, 280],
  'same key': [140, 190],
};

const keyboard = new Keyboard();

function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}
function median(xs) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Levenshtein alignment of typed keys against the target, with
// transpositions detected afterwards.
export function alignKeys(target, typed) {
  const n = target.length;
  const m = typed.length;
  const D = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) D[i][0] = i;
  for (let j = 0; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sub = D[i - 1][j - 1] + (target[i - 1] === typed[j - 1] ? 0 : 1);
      D[i][j] = Math.min(sub, D[i - 1][j] + 1, D[i][j - 1] + 1);
    }
  }
  const ops = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (target[i - 1] === typed[j - 1] ? 0 : 1)) {
      ops.push({ op: target[i - 1] === typed[j - 1] ? 'match' : 'substitution', target: target[i - 1], typed: typed[j - 1] });
      i--;
      j--;
    } else if (i > 0 && D[i][j] === D[i - 1][j] + 1) {
      ops.push({ op: 'omission', target: target[i - 1], typed: null });
      i--;
    } else {
      ops.push({ op: 'insertion', target: null, typed: typed[j - 1] });
      j--;
    }
  }
  ops.reverse();
  for (let k = 0; k + 1 < ops.length; k++) {
    const a = ops[k];
    const b = ops[k + 1];
    if (a.op === 'substitution' && b.op === 'substitution' && a.target === b.typed && a.typed === b.target) {
      a.op = 'transposition';
      b.op = 'transposed';
    }
  }
  return ops;
}

export function computeMetrics(sim) {
  const entries = sim.log;
  const presses = entries.filter((e) => e.key);
  const ikis = [];
  for (let k = 1; k < presses.length; k++) {
    const prev = presses[k - 1];
    const cur = presses[k];
    ikis.push({
      time: cur.time,
      iki: (cur.time - prev.time) * 1000,
      class: transitionClass(prev.key, cur.key),
      wordInitial: prev.key === 'space',
      key: cur.key,
    });
  }
  const byClass = {};
  for (const c of TRANSITION_CLASSES) {
    const xs = ikis.filter((x) => x.class === c).map((x) => x.iki);
    byClass[c] = { n: xs.length, mean: mean(xs), median: median(xs), reference: HUMAN_REFERENCE[c] };
  }
  const wordInitial = ikis.filter((x) => x.wordInitial).map((x) => x.iki);
  const withinWord = ikis.filter((x) => !x.wordInitial && x.key !== 'space').map((x) => x.iki);

  const typed = presses.map((e) => e.key);
  // While typing is in progress, score only the part of the text reached so
  // far, so that text not yet typed is not counted as omitted.
  const reached = sim.done ? sim.targetKeys.length : Math.min(sim.targetKeys.length, entries.length);
  const ops = alignKeys(sim.targetKeys.slice(0, reached), typed);
  const errors = { adjacentSubstitution: 0, otherSubstitution: 0, transposition: 0, omission: 0, insertion: 0 };
  for (const op of ops) {
    if (op.op === 'substitution') {
      if (keyboard.distance(op.target, op.typed) <= 1.5) errors.adjacentSubstitution++;
      else errors.otherSubstitution++;
    } else if (op.op === 'transposition') errors.transposition++;
    else if (op.op === 'omission') errors.omission++;
    else if (op.op === 'insertion') errors.insertion++;
  }
  const errorCount = Object.values(errors).reduce((a, b) => a + b, 0);
  const misses = entries.filter((e) => e.miss).length;
  const accidental = entries.filter((e) => e.accidental).length;
  const duration = presses.length > 1 ? presses[presses.length - 1].time - presses[0].time : 0;
  const wpm = duration > 0 ? (presses.length / 5) / (duration / 60) : 0;

  // Which finger produced each substitution: same finger (motor slip) or not.
  const sameFingerSubs = ops.filter((o) => o.op === 'substitution' && fingerFor(o.target)?.finger === fingerFor(o.typed)?.finger && fingerFor(o.target)?.hand === fingerFor(o.typed)?.hand).length;

  return {
    keystrokes: presses.length,
    target: sim.targetKeys.length,
    ikis,
    byClass,
    meanIki: mean(ikis.map((x) => x.iki)),
    medianIki: median(ikis.map((x) => x.iki)),
    wordInitialMean: mean(wordInitial),
    withinWordMean: mean(withinWord),
    errors,
    errorCount,
    sameFingerSubs,
    misses,
    accidental,
    accuracy: reached ? Math.max(0, 1 - errorCount / reached) : 1,
    wpm,
    ops,
    duration,
  };
}
