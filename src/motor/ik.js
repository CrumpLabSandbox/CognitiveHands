// Numerical inverse kinematics for one finger plus a small translation of
// the hand. Damped least squares with a numerical Jacobian: cheap enough to
// run once per planned keystroke.

import { Vector3 } from 'three';
import { JOINT_SPECS, DIP_PIP_RATIO, THUMB_IP_MCP_RATIO } from '../body/anatomy.js';
import { applyConstraints } from '../body/constraints.js';

// Joints the controller drives directly. Distal joints follow by coupling.
export const IK_JOINTS = {
  thumb: ['cmcFlex', 'cmcAbd', 'mcpFlex', 'ipFlex'],
  index: ['mcpFlex', 'mcpAbd', 'pipFlex'],
  middle: ['mcpFlex', 'mcpAbd', 'pipFlex'],
  ring: ['mcpFlex', 'mcpAbd', 'pipFlex'],
  little: ['mcpFlex', 'mcpAbd', 'pipFlex'],
};

export const MAX_OFFSET = 0.05;
const OFFSET_SCALE = 0.1; // one unit of the offset variable = 10 cm
const OFFSET_WEIGHT = 2.5; // prefer moving fingers to moving the hand

// Fill in coupled joints from the driven ones. The thumb's IP joint has its
// own long flexor and is driven directly; finger DIP joints follow the PIP.
export function completePose(pose, finger) {
  if (finger === 'thumb') {
    if (pose['thumb.ipFlex'] === undefined) pose['thumb.ipFlex'] = clamp('thumb.ipFlex', THUMB_IP_MCP_RATIO * pose['thumb.mcpFlex']);
  } else {
    pose[`${finger}.dipFlex`] = clamp(`${finger}.dipFlex`, DIP_PIP_RATIO * pose[`${finger}.pipFlex`]);
  }
  return pose;
}

function clamp(id, v) {
  const s = JOINT_SPECS[id];
  return Math.min(s.max, Math.max(s.min, v));
}

function solve3(A, b) {
  const [a, b1, c, d, e, f, g, h, i] = [A[0][0], A[0][1], A[0][2], A[1][0], A[1][1], A[1][2], A[2][0], A[2][1], A[2][2]];
  const det = a * (e * i - f * h) - b1 * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-18) return [0, 0, 0];
  const inv = [
    [(e * i - f * h) / det, (c * h - b1 * i) / det, (b1 * f - c * e) / det],
    [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [(d * h - e * g) / det, (b1 * g - a * h) / det, (a * e - b1 * d) / det],
  ];
  return inv.map((row) => row[0] * b[0] + row[1] * b[1] + row[2] * b[2]);
}

// Find joint angles (and hand offset) that bring the fingertip to `target`.
// Returns { joints, offset, error }.
// `tolerance` ({ x, z }) lets the tip land anywhere within a box around the
// target in the plane of the keyboard: a finger need not hit the exact
// centre of a key cap, and the thumb can strike the space bar wherever it is.
export function solveFingerIK(
  hand,
  finger,
  target,
  { pose, offset, lockOffset = false, maxIter = 40, lambda = 1e-3, postureBias = 0.08, tolerance = { x: 0, z: 0 } } = {},
) {
  const ids = IK_JOINTS[finger].map((j) => `${finger}.${j}`);
  const n = ids.length + (lockOffset ? 0 : 2);
  const q = ids.map((id) => pose[id] ?? JOINT_SPECS[id].rest);
  const off = offset ? offset.clone() : new Vector3();
  const base = { ...pose };
  const slack = (d, tol) => (Math.abs(d) <= tol ? 0 : d - Math.sign(d) * tol);
  const errorTo = (tip) => new Vector3(slack(target.x - tip.x, tolerance.x), target.y - tip.y, slack(target.z - tip.z, tolerance.z));

  // The tip is evaluated on the realised pose, so the solution already
  // compensates for enslaving from neighbouring fingers.
  const tipFor = (qv, ov) => {
    const p = { ...base };
    ids.forEach((id, i) => (p[id] = qv[i]));
    completePose(p, finger);
    return hand.fingerTip(finger, applyConstraints(p), ov);
  };

  let tip = tipFor(q, off);
  let err = errorTo(tip);
  for (let iter = 0; iter < maxIter && err.length() > 3e-4; iter++) {
    // Numerical Jacobian: 3 × n.
    const J = [[], [], []];
    const weights = [];
    for (let k = 0; k < ids.length; k++) {
      const hstep = 1e-3;
      const qd = q.slice();
      qd[k] += hstep;
      const t2 = tipFor(qd, off);
      J[0].push((t2.x - tip.x) / hstep);
      J[1].push((t2.y - tip.y) / hstep);
      J[2].push((t2.z - tip.z) / hstep);
      weights.push(1);
    }
    if (!lockOffset) {
      for (const axis of ['x', 'z']) {
        const od = off.clone();
        od[axis] += 1e-4;
        const t2 = tipFor(q, od);
        // Variable is offset / OFFSET_SCALE.
        J[0].push(((t2.x - tip.x) / 1e-4) * OFFSET_SCALE);
        J[1].push(((t2.y - tip.y) / 1e-4) * OFFSET_SCALE);
        J[2].push(((t2.z - tip.z) / 1e-4) * OFFSET_SCALE);
        weights.push(OFFSET_WEIGHT);
      }
    }
    // Δ = W⁻¹Jᵀ (J W⁻¹ Jᵀ + λI)⁻¹ e
    const A = [[lambda, 0, 0], [0, lambda, 0], [0, 0, lambda]];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = 0; k < n; k++) sum += (J[r][k] * J[c][k]) / weights[k];
        A[r][c] += sum;
      }
    }
    const y = solve3(A, [err.x, err.y, err.z]);
    const step = Math.min(1, 0.05 / err.length()); // limit per-iteration step
    for (let k = 0; k < n; k++) {
      const dq = ((J[0][k] * y[0] + J[1][k] * y[1] + J[2][k] * y[2]) / weights[k]) * step;
      if (k < ids.length) {
        // Secondary task: a gentle pull toward the resting posture, so the
        // solver prefers natural finger shapes among the many that reach.
        // It fades out over the first half of the iterations so that it
        // cannot hold the tip away from the target.
        const fade = Math.max(0, 1 - (2 * iter) / maxIter);
        const posture = postureBias * fade * (JOINT_SPECS[ids[k]].rest - q[k]);
        q[k] = clamp(ids[k], q[k] + dq + posture);
      } else {
        const axis = k === ids.length ? 'x' : 'z';
        off[axis] = Math.min(MAX_OFFSET, Math.max(-MAX_OFFSET, off[axis] + dq * OFFSET_SCALE));
      }
    }
    tip = tipFor(q, off);
    err = errorTo(tip);
  }
  const joints = {};
  ids.forEach((id, i) => (joints[id] = q[i]));
  completePose(joints, finger);
  return { joints, offset: off, error: err.length() };
}
