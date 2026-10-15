import { Simulator } from './sim/simulator.js';
import { computeMetrics } from './sim/metrics.js';
import { MODELS } from './cognitive/registry.js';
import { MOTOR_PARAMS } from './motor/controller.js';
import { HandScene } from './view/scene.js';
import { buildControls, renderTyped, renderMetrics, renderTrace, drawIkiChart, drawHistogram } from './view/ui.js';

const DEFAULT_TEXT = 'the quick brown fox jumps over the lazy dog. pack my box with five dozen liquor jugs.';

const viewport = document.getElementById('viewport');
const scene = new HandScene(viewport);
const typedNode = document.getElementById('typed');
const metricsNode = document.getElementById('metrics');
const traceNode = document.getElementById('trace');
const ikiCanvas = document.getElementById('iki-chart');
const histCanvas = document.getElementById('iki-hist');

let sim = null;
let running = false;
let simSpeed = 1;

const controls = buildControls(document.getElementById('controls'), {
  models: MODELS,
  motorParams: MOTOR_PARAMS,
  defaultText: DEFAULT_TEXT,
  onReset: () => reset(),
  onToggle: () => {
    if (sim.done) reset();
    running = !running;
    controls.setRunning(running);
  },
  onStep: (seconds) => {
    running = false;
    controls.setRunning(false);
    sim.advance(seconds);
    refreshPanels();
  },
  onMotorChange: (k, v) => {
    sim.controller.params[k] = v;
  },
  onSpeed: (v) => {
    simSpeed = v;
  },
  onToggleArms: (show) => {
    scene.showArms = show;
  },
});

function reset() {
  const { modelId, modelParams, motorParams, text, seed } = controls.state;
  sim = new Simulator({ modelId, modelParams: { ...modelParams }, motorParams: { ...motorParams }, text, seed });
  scene.buildKeyboard(sim.keyboard);
  running = false;
  controls.setRunning(false);
  refreshPanels();
}

function refreshPanels() {
  const m = computeMetrics(sim);
  renderTyped(typedNode, sim);
  renderMetrics(metricsNode, m, sim);
  renderTrace(traceNode, sim);
  drawIkiChart(ikiCanvas, m);
  drawHistogram(histCanvas, m);
}

reset();

let last = performance.now();
let lastPanel = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (running && !sim.done) {
    sim.advance(dt * simSpeed);
    if (sim.done) {
      running = false;
      controls.setRunning(false);
      refreshPanels();
    }
  }
  scene.update(sim);
  if (now - lastPanel > 120) {
    lastPanel = now;
    if (running) refreshPanels();
    else renderTrace(traceNode, sim);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
