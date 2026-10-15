// Controls and read-outs, built from the model registries so new models
// and parameters appear without UI changes.

import { TRANSITION_CLASSES } from '../motor/fingering.js';
import { HUMAN_REFERENCE } from '../sim/metrics.js';
import { keyToChar } from '../instrument/layout.js';
import { FINGER_COLORS } from './scene.js';

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
}

function slider(spec, value, onInput) {
  const out = el('span', { class: 'val', text: fmt(value, spec.step) });
  const input = el('input', { type: 'range', min: spec.min, max: spec.max, step: spec.step, value });
  input.addEventListener('input', () => {
    out.textContent = fmt(Number(input.value), spec.step);
    onInput(Number(input.value));
  });
  return el('label', { class: 'param' }, [el('span', { class: 'name', text: spec.label }), input, out]);
}

function fmt(v, step) {
  const decimals = step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step)));
  return Number(v).toFixed(decimals);
}

export function buildControls(root, { models, motorParams, defaultText, onReset, onToggle, onStep, onMotorChange, onSpeed, onToggleArms }) {
  const state = {
    modelId: models[0].id,
    modelParams: {},
    motorParams: Object.fromEntries(Object.entries(motorParams).map(([k, v]) => [k, v.default])),
    text: defaultText,
    seed: 1,
    simSpeed: 1,
  };

  const modelSelect = el('select', {}, models.map((m) => el('option', { value: m.id, text: m.label })));
  const description = el('p', { class: 'description', text: models[0].description });
  const paramBox = el('div', { class: 'params' });

  const renderModelParams = () => {
    const Model = models.find((m) => m.id === state.modelId);
    state.modelParams = Object.fromEntries(Object.entries(Model.params).map(([k, v]) => [k, v.default]));
    description.textContent = Model.description;
    paramBox.replaceChildren(
      ...Object.entries(Model.params).map(([k, spec]) =>
        slider(spec, state.modelParams[k], (v) => {
          state.modelParams[k] = v;
          onReset();
        }),
      ),
    );
  };
  modelSelect.addEventListener('change', () => {
    state.modelId = modelSelect.value;
    renderModelParams();
    onReset();
  });
  renderModelParams();

  const motorBox = el('div', { class: 'params' }, Object.entries(motorParams).map(([k, spec]) =>
    slider(spec, state.motorParams[k], (v) => {
      state.motorParams[k] = v;
      onMotorChange(k, v);
    }),
  ));

  const textArea = el('textarea', { rows: 3 });
  textArea.value = defaultText;
  textArea.addEventListener('change', () => {
    state.text = textArea.value;
    onReset();
  });
  const seedInput = el('input', { type: 'number', value: 1, min: 0, step: 1 });
  seedInput.addEventListener('change', () => {
    state.seed = Number(seedInput.value);
    onReset();
  });

  const runButton = el('button', { class: 'primary', text: 'Run', onclick: () => onToggle() });
  const resetButton = el('button', { text: 'Reset', onclick: () => onReset() });
  const stepButton = el('button', { text: 'Step 50 ms', onclick: () => onStep(0.05) });
  const speed = slider({ min: 0.05, max: 4, step: 0.05, label: 'Playback speed (× real time)' }, 1, (v) => {
    state.simSpeed = v;
    onSpeed(v);
  });
  const armsToggle = el('label', { class: 'check' }, [
    el('input', { type: 'checkbox', checked: 'checked', onchange: (e) => onToggleArms(e.target.checked) }),
    el('span', { text: 'Show arms' }),
  ]);

  root.replaceChildren(
    el('h1', { text: 'Cognitive Hands' }),
    el('p', { class: 'tagline', text: 'Simulated hands under the control of models of action sequencing.' }),
    el('section', {}, [el('h2', { text: 'Cognitive model' }), modelSelect, description, paramBox]),
    el('section', {}, [el('h2', { text: 'Motor layer' }), motorBox]),
    el('section', {}, [
      el('h2', { text: 'Text to type' }),
      textArea,
      el('label', { class: 'inline' }, [el('span', { text: 'Random seed' }), seedInput]),
    ]),
    el('section', {}, [el('h2', { text: 'Run' }), el('div', { class: 'buttons' }, [runButton, resetButton, stepButton]), speed, armsToggle]),
    el('section', { class: 'legend' }, [
      el('h2', { text: 'Fingers' }),
      ...Object.entries(FINGER_COLORS).map(([f, c]) =>
        el('span', { class: 'swatch' }, [el('i', { style: `background:#${c.toString(16).padStart(6, '0')}` }), el('span', { text: f })]),
      ),
    ]),
  );

  return {
    state,
    setRunning(running) {
      runButton.textContent = running ? 'Pause' : 'Run';
    },
  };
}

export function renderTyped(node, sim) {
  const frag = document.createDocumentFragment();
  for (const e of sim.log) {
    if (e.miss) {
      frag.append(el('span', { class: 'miss', title: `missed ${e.intended}` , text: '·' }));
      continue;
    }
    const ch = keyToChar(e.key);
    const cls = e.accidental ? 'accidental' : e.key === e.intended ? 'ok' : 'wrong';
    const span = el('span', { class: cls, text: ch === ' ' ? ' ' : ch === '\n' ? '⏎' : ch });
    if (e.intended && e.key !== e.intended) span.title = `intended ${e.intended}`;
    frag.append(span);
  }
  if (!sim.done) frag.append(el('span', { class: 'cursor', text: '▏' }));
  node.replaceChildren(frag);
}

export function renderMetrics(node, m, sim) {
  const rows = TRANSITION_CLASSES.map((c) => {
    const v = m.byClass[c];
    const ref = HUMAN_REFERENCE[c];
    return el('tr', {}, [
      el('td', { text: c }),
      el('td', { text: v.n ? `${v.mean.toFixed(0)}` : '–' }),
      el('td', { text: v.n ? `${v.median.toFixed(0)}` : '–' }),
      el('td', { text: String(v.n) }),
      el('td', { class: 'ref', text: `${ref[0]}–${ref[1]}` }),
    ]);
  });
  const status = sim.stalled ? 'stalled' : sim.done ? 'finished' : 'typing';
  node.replaceChildren(
    el('div', { class: 'stats' }, [
      stat('Status', status),
      stat('Keystrokes', `${m.keystrokes} / ${m.target}`),
      stat('Speed', `${m.wpm.toFixed(0)} wpm`),
      stat('Mean IKI', isNaN(m.meanIki) ? '–' : `${m.meanIki.toFixed(0)} ms`),
      stat('Accuracy', `${(m.accuracy * 100).toFixed(1)} %`),
      stat('Word-initial IKI', isNaN(m.wordInitialMean) ? '–' : `${m.wordInitialMean.toFixed(0)} ms`),
      stat('Within-word IKI', isNaN(m.withinWordMean) ? '–' : `${m.withinWordMean.toFixed(0)} ms`),
    ]),
    el('table', {}, [
      el('thead', {}, [el('tr', {}, ['Transition', 'Mean ms', 'Median ms', 'n', 'Skilled humans*'].map((t) => el('th', { text: t })))]),
      el('tbody', {}, rows),
    ]),
    el('p', { class: 'note', text: '*Approximate ranges for skilled typists from the literature; to be replaced with Typing Science Platform estimates.' }),
    el('div', { class: 'stats' }, [
      stat('Adjacent-key substitutions', m.errors.adjacentSubstitution),
      stat('Other substitutions', m.errors.otherSubstitution),
      stat('Transpositions', m.errors.transposition),
      stat('Omissions', m.errors.omission),
      stat('Insertions', m.errors.insertion),
      stat('Missed presses', m.misses),
      stat('Accidental presses', m.accidental),
    ]),
  );
}

function stat(label, value) {
  return el('div', { class: 'stat' }, [el('span', { class: 'label', text: label }), el('span', { class: 'value', text: String(value) })]);
}

export function drawIkiChart(canvas, m) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const pad = { l: 36, r: 10, t: 12, b: 44 };
  const maxMs = 400;
  const y = (ms) => pad.t + (H - pad.t - pad.b) * (1 - Math.min(ms, maxMs) / maxMs);
  ctx.strokeStyle = '#444a57';
  ctx.fillStyle = '#9aa3b5';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  for (let ms = 0; ms <= maxMs; ms += 100) {
    ctx.beginPath();
    ctx.moveTo(pad.l, y(ms));
    ctx.lineTo(W - pad.r, y(ms));
    ctx.stroke();
    ctx.fillText(String(ms), pad.l - 4, y(ms) + 4);
  }
  const n = TRANSITION_CLASSES.length;
  const slot = (W - pad.l - pad.r) / n;
  TRANSITION_CLASSES.forEach((c, i) => {
    const x0 = pad.l + slot * i + slot * 0.15;
    const w = slot * 0.7;
    const ref = HUMAN_REFERENCE[c];
    ctx.fillStyle = 'rgba(150, 170, 255, 0.18)';
    ctx.fillRect(x0, y(ref[1]), w, y(ref[0]) - y(ref[1]));
    const v = m.byClass[c];
    if (v.n) {
      ctx.fillStyle = '#f3a712';
      ctx.fillRect(x0 + w * 0.25, y(v.mean), w * 0.5, y(0) - y(v.mean));
    }
    ctx.fillStyle = '#c9d0dc';
    ctx.textAlign = 'center';
    const words = c.split(', ');
    words.forEach((word, k) => ctx.fillText(word, x0 + w / 2, H - pad.b + 14 + k * 13));
  });
}

export function drawHistogram(canvas, m) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const pad = { l: 30, r: 10, t: 10, b: 24 };
  const maxMs = 600;
  const binMs = 20;
  const bins = new Array(maxMs / binMs).fill(0);
  for (const x of m.ikis) {
    const b = Math.min(bins.length - 1, Math.floor(x.iki / binMs));
    bins[b]++;
  }
  const peak = Math.max(1, ...bins);
  const bw = (W - pad.l - pad.r) / bins.length;
  ctx.fillStyle = '#29a19c';
  bins.forEach((c, i) => {
    const h = ((H - pad.t - pad.b) * c) / peak;
    ctx.fillRect(pad.l + i * bw + 1, H - pad.b - h, bw - 2, h);
  });
  ctx.fillStyle = '#9aa3b5';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let ms = 0; ms <= maxMs; ms += 100) ctx.fillText(String(ms), pad.l + (ms / maxMs) * (W - pad.l - pad.r), H - 8);
  ctx.textAlign = 'left';
  ctx.fillText('inter-keystroke interval (ms)', pad.l, 10);
}

export function renderTrace(node, sim) {
  const out = sim.lastOut ?? {};
  const trace = out.trace;
  const parts = [];
  if (trace?.items) {
    parts.push(
      el('div', { class: 'bars' }, trace.items.map((it) =>
        el('div', { class: 'bar' + (it.launched ? ' launched' : '') }, [
          el('i', { style: `height:${Math.round(Math.min(1, it.activation) * 48)}px` }),
          el('span', { text: keyToChar(it.key) === ' ' ? '␣' : it.key }),
        ]),
      )),
    );
  }
  if (trace?.word !== undefined) parts.push(el('p', { text: `inner loop buffer: "${trace.word.replace(/space/g, '␣')}"  ·  next word ${trace.nextReady ? 'ready' : 'being retrieved'}` }));
  if (trace?.traces !== undefined) parts.push(el('p', { text: `${trace.traces} traces in memory · echo intensity ${trace.intensity?.toFixed(2)} · next: ${trace.nextKey} in ${(trace.nextRt * 1000).toFixed(0)} ms` }));
  const snap = sim.controller.snapshot();
  const busy = [];
  for (const side of ['left', 'right']) for (const [f, plan] of Object.entries(snap[side])) if (plan) busy.push(`${side} ${f} → ${plan.key} (${plan.phase})`);
  parts.push(el('p', { class: 'busy', text: busy.length ? busy.join(' · ') : 'fingers at rest' }));
  node.replaceChildren(...parts);
}
