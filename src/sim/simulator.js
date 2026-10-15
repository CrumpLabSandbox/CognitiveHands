// Ties the layers together: cognitive model → motor controller → hands →
// keyboard → feedback, stepped at a fixed rate.

import { Vector3, Quaternion } from 'three';
import { Hand } from '../body/hand.js';
import { Arm } from '../body/arm.js';
import { REST_POSE, FINGERS, deg } from '../body/anatomy.js';
import { Keyboard } from '../instrument/keyboard.js';
import { textToKeys } from '../instrument/layout.js';
import { MotorController } from '../motor/controller.js';
import { HOME_KEYS } from '../motor/fingering.js';
import { createModel } from '../cognitive/registry.js';
import { makeRng } from '../util/random.js';

export const DT = 1 / 400;
const STALL_SECONDS = 4;
const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

export class Simulator {
  constructor({ modelId, modelParams = {}, motorParams = {}, text = '', seed = 1 }) {
    this.config = { modelId, modelParams, motorParams, text, seed };
    this.reset();
  }

  reset() {
    const { modelId, modelParams, motorParams, text, seed } = this.config;
    this.rng = makeRng(seed);
    this.time = 0;
    this.keyboard = new Keyboard();
    this.hands = { left: new Hand('left'), right: new Hand('right') };
    this.arms = { left: new Arm('left'), right: new Arm('right') };
    this.placeHands();
    this.controller = new MotorController({ hands: this.hands, keyboard: this.keyboard, rng: this.rng, params: motorParams });
    this.model = createModel(modelId, modelParams, this.rng);
    this.targetKeys = textToKeys(text);
    this.model.reset(this.targetKeys);
    this.log = [];
    this.lastCompleted = [];
    this.lastOut = { activations: {}, launch: [] };
    this.done = false;
    this.stalled = false;
    this.lastActivity = 0;
  }

  // Put each hand so that its fingers hover over the home keys. The hand is
  // pitched down toward the keys and rolled so that the little-finger side
  // sits lower (the forearms are not fully pronated), as in a seated
  // typist; this lets the short little finger and the long middle finger
  // share a row with natural, moderately flexed postures. The middle finger
  // anchors the placement; the controller solves the other fingers. Values
  // from scripts/posture.mjs.
  placeHands() {
    const pitch = deg(15);
    const roll = deg(17.5);
    for (const side of ['left', 'right']) {
      const hand = this.hands[side];
      hand.baseQuaternion
        .setFromAxisAngle(X_AXIS, -pitch)
        .multiply(new Quaternion().setFromAxisAngle(Z_AXIS, -hand.s * roll))
        .multiply(new Quaternion().setFromAxisAngle(Y_AXIS, Math.PI));
      hand.basePosition.set(0, 0, 0);
      hand.offset.set(0, 0, 0);
      // The anchor posture has the middle finger pad at actuation depth, so
      // that every press is within reach and hovering is done by lifting.
      const pose = { ...REST_POSE, 'middle.mcpFlex': deg(28), 'middle.pipFlex': deg(55), 'middle.dipFlex': deg(33) };
      const tip = hand.fingerTip('middle', pose, new Vector3());
      const home = this.keyboard.keyCenter(HOME_KEYS[side].middle).clone();
      home.y -= 0.003;
      hand.basePosition.copy(home.sub(tip));
      hand.setCommanded({ ...REST_POSE });
    }
  }

  step() {
    if (this.done) return;
    const dt = DT;
    const feedback = { time: this.time, completed: this.lastCompleted, pending: this.controller.pending };
    const out = this.model.step(dt, feedback);
    this.lastOut = out;

    const synthetic = [];
    for (const key of out.launch ?? []) {
      if (!this.controller.request(key, this.time)) {
        synthetic.push({ intended: key, actual: null, hand: null, finger: null, time: this.time, latency: 0 });
      }
    }
    const completed = this.controller.update(dt, out.activations ?? {});

    const tips = [];
    for (const side of ['left', 'right']) {
      const t = this.hands[side].tips();
      for (const f of FINGERS) tips.push({ hand: side, finger: f, pos: t[f] });
    }
    const events = this.keyboard.update(tips, this.time);
    for (const ev of events) {
      if (ev.type !== 'down') continue;
      const info = this.controller.notifyKeyDown(ev);
      this.log.push({ time: this.time, key: ev.key, intended: info.intended, hand: ev.hand, finger: ev.finger, accidental: info.intended === null });
      this.lastActivity = this.time;
    }
    for (const c of completed) {
      if (c.actual === null) {
        this.log.push({ time: this.time, key: null, intended: c.intended, hand: c.hand, finger: c.finger, miss: true });
      }
      this.lastActivity = this.time;
    }
    this.lastCompleted = [...completed, ...synthetic];
    this.time += dt;

    if (out.done && this.controller.pending === 0) this.done = true;
    if (this.time - this.lastActivity > STALL_SECONDS && !this.done) {
      this.done = true;
      this.stalled = true;
    }
  }

  advance(seconds) {
    const steps = Math.min(2000, Math.round(seconds / DT));
    for (let i = 0; i < steps && !this.done; i++) this.step();
  }

  runToEnd(maxSeconds = 600) {
    while (!this.done && this.time < maxSeconds) this.step();
    return this;
  }

  typedKeys() {
    return this.log.filter((e) => e.key).map((e) => e.key);
  }
}
