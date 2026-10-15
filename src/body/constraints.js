// Known constraints on hand motion: fingers are not independent, and
// joints cannot exceed their ranges. Applied to the commanded pose to get
// the realised pose.

import { FINGERS, JOINT_SPECS, REST_POSE, ENSLAVING } from './anatomy.js';

const FLEXION_JOINTS = {
  thumb: ['mcpFlex', 'ipFlex'],
  index: ['mcpFlex', 'pipFlex', 'dipFlex'],
  middle: ['mcpFlex', 'pipFlex', 'dipFlex'],
  ring: ['mcpFlex', 'pipFlex', 'dipFlex'],
  little: ['mcpFlex', 'pipFlex', 'dipFlex'],
};

// Flexing one finger drags its neighbours along by the enslaving fractions.
export function applyEnslaving(commanded) {
  const out = { ...commanded };
  for (const master of FINGERS) {
    const row = ENSLAVING[master];
    for (const slave of FINGERS) {
      const e = row[slave];
      if (!e) continue;
      for (const j of FLEXION_JOINTS[slave]) {
        const masterId = `${master}.${j}`;
        if (!(masterId in commanded)) continue;
        const deviation = commanded[masterId] - REST_POSE[masterId];
        out[`${slave}.${j}`] = (out[`${slave}.${j}`] ?? REST_POSE[`${slave}.${j}`]) + e * deviation;
      }
    }
  }
  return out;
}

export function clampPose(pose) {
  const out = { ...pose };
  for (const [id, spec] of Object.entries(JOINT_SPECS)) {
    const v = out[id] ?? spec.rest;
    out[id] = Math.min(spec.max, Math.max(spec.min, v));
  }
  return out;
}

export function clampJoint(id, value) {
  const spec = JOINT_SPECS[id];
  if (!spec) return value;
  return Math.min(spec.max, Math.max(spec.min, value));
}

export function applyConstraints(commanded) {
  return clampPose(applyEnslaving(commanded));
}
