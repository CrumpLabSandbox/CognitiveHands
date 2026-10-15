// The motor layer: turns "press J now" into finger trajectories and hand
// movements. Each keystroke is planned as reach → press → hold → release,
// with minimum-jerk profiles, inverse kinematics to find the joint angles,
// and signal-dependent noise on the planned endpoint. Fingers that are not
// pressing drift toward the keys the cognitive layer is activating, so
// movements toward upcoming keys start before the current one ends.

import { Vector3 } from 'three';
import { FINGERS, REST_POSE, MOTOR_NOISE } from '../body/anatomy.js';
import { fingerFor, HOME_KEYS } from './fingering.js';
import { solveFingerIK } from './ik.js';
import { minJerk, lerpJoints, reachDuration } from './trajectory.js';
import { PITCH } from '../instrument/layout.js';

export const MOTOR_PARAMS = {
  speed: { default: 1, min: 0.3, max: 2.5, step: 0.05, label: 'Movement speed (×)' },
  noise: { default: 1, min: 0, max: 4, step: 0.1, label: 'Motor noise (×)' },
  anticipation: { default: 1, min: 0, max: 1, step: 0.05, label: 'Anticipatory movement' },
  hoverHeight: { default: 0.008, min: 0.003, max: 0.02, step: 0.001, label: 'Hover height (m)' },
  pressDepth: { default: 0.004, min: 0.0015, max: 0.006, step: 0.0005, label: 'Press depth (m)' },
};

const SIDES = ['left', 'right'];
const PRESS_T = 0.04;
const HOLD_T = 0.01;
const RELEASE_T = 0.04;
const SOFT_TAU = 0.12; // time constant of anticipatory finger drift
const OFFSET_TAU = 0.2; // time constant of anticipatory hand drift

function fingerJoints(pose, finger) {
  const out = {};
  for (const id of Object.keys(REST_POSE)) if (id.startsWith(`${finger}.`)) out[id] = pose[id];
  return out;
}

export class MotorController {
  constructor({ hands, keyboard, rng, params = {} }) {
    this.hands = hands;
    this.keyboard = keyboard;
    this.rng = rng;
    this.params = { ...Object.fromEntries(Object.entries(MOTOR_PARAMS).map(([k, v]) => [k, v.default])), ...params };
    this.time = 0;
    this.pending = 0;
    this.state = {};
    for (const side of SIDES) {
      this.state[side] = {
        fingers: Object.fromEntries(
          FINGERS.map((f) => [f, { plan: null, queue: [], joints: fingerJoints(REST_POSE, f), home: fingerJoints(REST_POSE, f) }]),
        ),
        offset: new Vector3(),
        offsetPlan: null,
        cache: new Map(),
      };
      // Resting posture: each finger hovers over its home key, ready to press.
      let pose = { ...REST_POSE };
      for (const f of FINGERS) {
        const sol = this.planKeyPose(side, f, HOME_KEYS[side][f], pose, new Vector3(), true);
        const fs = this.state[side].fingers[f];
        fs.home = { ...fs.home, ...sol.hover };
        fs.joints = { ...fs.home };
        pose = { ...pose, ...sol.hover };
      }
      hands[side].offset.set(0, 0, 0);
      hands[side].setCommanded(this.commandedPose(side));
    }
  }

  // Joint angles for striking a key and for hovering above it, ready to
  // strike. The press is solved first (fingers do the work unless the key
  // is out of the finger's range, in which case the hand moves too); the
  // hover is the press posture lifted at the knuckle, which is how a
  // keystroke is actually made: mostly flexion at the MCP joint.
  planKeyPose(side, finger, key, pose, offset, lockOffset = false) {
    const hand = this.hands[side];
    const tolerance = this.keyTolerance(key);
    const target = this.keyTarget(key, hand.fingerTip(finger, pose, offset));
    target.y -= this.params.pressDepth;
    let sol = solveFingerIK(hand, finger, target, { pose, offset, lockOffset: true, tolerance });
    if (sol.error > 0.0005 && !lockOffset) sol = solveFingerIK(hand, finger, target, { pose, offset, lockOffset: false, tolerance });
    const press = sol.joints;
    const hover = this.liftPose(side, finger, { ...pose, ...press }, sol.offset, this.params.hoverHeight + this.params.pressDepth);
    return { press, hover, offset: sol.offset, error: sol.error };
  }

  // Raise the fingertip straight up by `lift` from a press posture, staying
  // over the same spot: the hover from which the strike is made.
  liftPose(side, finger, pose, offset, lift) {
    const hand = this.hands[side];
    const target = hand.fingerTip(finger, pose, offset);
    target.y += lift;
    const sol = solveFingerIK(hand, finger, target, { pose, offset, lockOffset: true, tolerance: { x: 0.002, z: 0.002 }, postureBias: 0 });
    const lifted = {};
    for (const k of Object.keys(pose)) if (k.startsWith(`${finger}.`)) lifted[k] = pose[k];
    return { ...lifted, ...sol.joints };
  }

  // How far from a key's centre the fingertip may land and still be well
  // inside the cap. Wide keys (the space bar) leave a lot of room.
  keyTolerance(key) {
    const k = this.keyboard.key(key);
    return { x: Math.max(0, k.width / 2 - 0.0055), z: Math.max(0, PITCH / 2 - 0.0055) };
  }

  // Where on a key to aim: the centre, except that on wide keys the finger
  // strikes wherever along the key it already is.
  keyTarget(key, tip) {
    const k = this.keyboard.key(key);
    const target = k.center.clone();
    const slack = this.keyTolerance(key).x;
    if (slack > 0 && tip) target.x = Math.min(k.center.x + slack, Math.max(k.center.x - slack, tip.x));
    return target;
  }

  homePose(side) {
    const st = this.state[side];
    const pose = { 'wrist.flex': REST_POSE['wrist.flex'], 'wrist.dev': REST_POSE['wrist.dev'] };
    for (const f of FINGERS) Object.assign(pose, st.fingers[f].home);
    return pose;
  }

  get activePhases() {
    return ['lift', 'reach', 'press', 'hold'];
  }

  commandedPose(side) {
    const st = this.state[side];
    const pose = { 'wrist.flex': REST_POSE['wrist.flex'], 'wrist.dev': REST_POSE['wrist.dev'] };
    for (const f of FINGERS) Object.assign(pose, st.fingers[f].joints);
    return pose;
  }

  // Hover solution for a key from the resting posture, used for
  // anticipatory movement. Cached per hand and key.
  hoverSolution(side, key) {
    const st = this.state[side];
    if (!st.cache.has(key)) {
      const assign = fingerFor(key);
      const sol = this.planKeyPose(side, assign.finger, key, this.homePose(side), new Vector3());
      st.cache.set(key, { joints: sol.hover, offset: sol.offset });
    }
    return st.cache.get(key);
  }

  // Ask for a keystroke. Returns false if no finger is assigned to the key.
  request(key, time = this.time) {
    const assign = fingerFor(key);
    if (!assign || !this.keyboard.key(key)) return false;
    const fs = this.state[assign.hand].fingers[assign.finger];
    const req = { key, intended: key, time };
    this.pending++;
    if (fs.plan && this.activePhases.includes(fs.plan.phase)) fs.queue.push(req);
    else this.startPlan(assign.hand, assign.finger, req);
    return true;
  }

  startPlan(side, finger, req) {
    const p = this.params;
    const hand = this.hands[side];
    const st = this.state[side];
    const fs = st.fingers[finger];
    const currentPose = this.commandedPose(side);
    const currentOffset = st.offset.clone();
    const planned = this.planKeyPose(side, finger, req.key, currentPose, currentOffset);

    // Signal-dependent noise on the planned endpoint: the strike lands
    // wherever the noisy plan puts it, so long reaches miss more often.
    const noisyPress = {};
    for (const [id, v] of Object.entries(planned.press)) {
      const delta = Math.abs(v - (currentPose[id] ?? v));
      const sd = p.noise * (MOTOR_NOISE.joint.constant + MOTOR_NOISE.joint.proportional * delta);
      noisyPress[id] = v + this.rng.gaussian(0, sd);
    }
    const offTarget = planned.offset.clone();
    for (const axis of ['x', 'z']) {
      const delta = Math.abs(offTarget[axis] - currentOffset[axis]);
      const sd = p.noise * (MOTOR_NOISE.offset.constant + MOTOR_NOISE.offset.proportional * delta);
      offTarget[axis] += this.rng.gaussian(0, sd);
    }
    const noisy = this.liftPose(side, finger, { ...currentPose, ...noisyPress }, offTarget, p.hoverHeight + p.pressDepth);
    const press = { joints: noisyPress };
    const hoverTip = hand.fingerTip(finger, { ...currentPose, ...noisy }, offTarget);

    const currentTip = hand.fingerTip(finger, currentPose, currentOffset);
    const distance = currentTip.distanceTo(hoverTip);
    const T = distance < 0.002 ? 0.015 : reachDuration(distance, p.speed);

    // Longer reaches go through a via point above the midpoint, so the
    // fingertip arcs over intervening keys instead of dragging across them.
    let via = null;
    if (distance > 0.012) {
      const mid = currentTip.clone().lerp(hoverTip, 0.5);
      mid.y = Math.max(currentTip.y, hoverTip.y) + 0.006;
      const viaSol = solveFingerIK(hand, finger, mid, { pose: currentPose, offset: offTarget, lockOffset: true, tolerance: { x: 0.004, z: 0.004 } });
      via = viaSol.joints;
    }

    fs.plan = {
      key: req.key,
      intended: req.intended,
      phase: via ? 'lift' : 'reach',
      t: 0,
      T: via ? T * 0.5 : T,
      reachT: via ? T * 0.5 : T,
      from: { ...fs.joints },
      to: via ?? noisy,
      hover: noisy,
      press: press.joints,
      actual: null,
      startTime: this.time,
      requestTime: req.time,
    };
    if (offTarget.distanceTo(st.offset) > 1e-4) {
      st.offsetPlan = { from: st.offset.clone(), to: offTarget, t: 0, T: Math.max(T, 0.05) };
    }
  }

  // A key went down under this finger; record which key it actually was.
  notifyKeyDown(ev) {
    const fs = this.state[ev.hand]?.fingers[ev.finger];
    const plan = fs?.plan;
    if (plan && plan.phase !== 'release' && plan.actual === null) {
      plan.actual = ev.key;
      return { intended: plan.intended };
    }
    return { intended: null };
  }

  // Advance all movements by dt. Returns completed keystroke plans.
  update(dt, activations = {}) {
    this.time += dt;
    const p = this.params;
    const completed = [];
    for (const side of SIDES) {
      const st = this.state[side];
      const anyActive = FINGERS.some((f) => st.fingers[f].plan && this.activePhases.includes(st.fingers[f].plan.phase));

      // Hand translation: planned move, or anticipatory drift when free.
      if (st.offsetPlan) {
        const op = st.offsetPlan;
        op.t += dt;
        st.offset.lerpVectors(op.from, op.to, minJerk(op.t / op.T));
        if (op.t >= op.T) st.offsetPlan = null;
      } else if (!anyActive) {
        const target = new Vector3();
        let total = 0;
        if (p.anticipation > 0) {
          for (const [key, a] of Object.entries(activations)) {
            const assign = fingerFor(key);
            if (!assign || assign.hand !== side || a < 0.15 || !this.keyboard.key(key)) continue;
            target.addScaledVector(this.hoverSolution(side, key).offset, a);
            total += a;
          }
        }
        if (total > 0) target.divideScalar(total);
        const rate = Math.min(1, (dt / OFFSET_TAU) * Math.max(p.anticipation, 0.25));
        st.offset.lerp(target, rate);
      }

      for (const finger of FINGERS) {
        const fs = st.fingers[finger];
        if (fs.plan) {
          const plan = fs.plan;
          plan.t += dt;
          fs.joints = lerpJoints(plan.from, plan.to, minJerk(plan.t / plan.T));
          if (plan.t >= plan.T) {
            if (plan.phase === 'lift') {
              Object.assign(plan, { phase: 'reach', t: 0, T: plan.reachT, from: { ...fs.joints }, to: plan.hover });
            } else if (plan.phase === 'reach') {
              Object.assign(plan, { phase: 'press', t: 0, T: PRESS_T / p.speed, from: { ...fs.joints }, to: plan.press });
            } else if (plan.phase === 'press') {
              Object.assign(plan, { phase: 'hold', t: 0, T: HOLD_T, from: { ...fs.joints }, to: plan.press });
              this.pending = Math.max(0, this.pending - 1);
              completed.push({
                intended: plan.intended,
                actual: plan.actual,
                hand: side,
                finger,
                time: this.time,
                latency: this.time - plan.requestTime,
              });
            } else if (plan.phase === 'hold') {
              if (fs.queue.length) {
                fs.plan = null;
                this.startPlan(side, finger, fs.queue.shift());
              } else {
                Object.assign(plan, { phase: 'release', t: 0, T: RELEASE_T / p.speed, from: { ...fs.joints }, to: plan.hover });
              }
            } else if (plan.phase === 'release') {
              fs.plan = null;
              if (fs.queue.length) this.startPlan(side, finger, fs.queue.shift());
            }
          }
        } else {
          // Idle finger: drift toward the most activated upcoming key it
          // owns, otherwise back to its home key.
          let target = { ...fs.home };
          if (p.anticipation > 0) {
            let best = null;
            let bestA = 0.05;
            for (const [key, a] of Object.entries(activations)) {
              const assign = fingerFor(key);
              if (assign && assign.hand === side && assign.finger === finger && a > bestA && this.keyboard.key(key)) {
                best = key;
                bestA = a;
              }
            }
            if (best) {
              const sol = this.hoverSolution(side, best);
              target = lerpJoints(target, { ...target, ...sol.joints }, Math.min(1, bestA * p.anticipation));
            }
          }
          fs.joints = lerpJoints(fs.joints, target, Math.min(1, dt / SOFT_TAU));
        }
      }

      const hand = this.hands[side];
      hand.offset.copy(st.offset);
      hand.setCommanded(this.commandedPose(side));
    }
    return completed;
  }

  // For display: which finger is doing what.
  snapshot() {
    const out = {};
    for (const side of SIDES) {
      out[side] = {};
      for (const f of FINGERS) {
        const plan = this.state[side].fingers[f].plan;
        out[side][f] = plan ? { key: plan.key, phase: plan.phase } : null;
      }
    }
    return out;
  }
}
