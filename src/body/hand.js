// Kinematic model of one hand: 27 bones hung from a wrist frame, posed by
// joint angles, producing world positions for drawing and for contact
// with the keyboard.

import { Matrix4, Vector3, Quaternion } from 'three';
import { FINGERS, FINGER_SPECS, REST_POSE, CARPALS } from './anatomy.js';
import { applyConstraints } from './constraints.js';

const UNIT = new Vector3(1, 1, 1);

export class Hand {
  constructor(side = 'right') {
    this.side = side;
    this.s = side === 'right' ? 1 : -1;
    this.basePosition = new Vector3();
    this.baseQuaternion = new Quaternion();
    // Small translation of the whole hand (produced by the arm) relative to
    // the home position.
    this.offset = new Vector3();
    this.commanded = { ...REST_POSE };
    this.pose = { ...REST_POSE };
  }

  // World transform of the hand frame, including the wrist joint.
  wristMatrix(pose = this.pose, offset = this.offset) {
    const m = new Matrix4().compose(
      new Vector3().addVectors(this.basePosition, offset),
      this.baseQuaternion,
      UNIT,
    );
    m.multiply(new Matrix4().makeRotationY(this.s * (pose['wrist.dev'] ?? 0)));
    m.multiply(new Matrix4().makeRotationX(pose['wrist.flex'] ?? 0));
    return m;
  }

  // Forward kinematics of a single ray: segments (bones), joint centres
  // and the fingertip, all in world coordinates.
  fingerChain(finger, pose = this.pose, wrist = this.wristMatrix(pose)) {
    const spec = FINGER_SPECS[finger];
    const s = this.s;
    const angle = (k) => pose[`${finger}.${k}`] ?? 0;
    const m = wrist
      .clone()
      .multiply(new Matrix4().makeTranslation(s * spec.base[0], spec.base[1], spec.base[2]))
      .multiply(new Matrix4().makeRotationY(s * spec.splay));

    const segments = [];
    const joints = [];
    let pad = null;
    const origin = () => new Vector3().setFromMatrixPosition(m);
    const bone = (name) => {
      const from = origin();
      m.multiply(new Matrix4().makeTranslation(0, 0, spec.lengths[name]));
      const to = origin();
      segments.push({ name: `${finger}.${name}`, finger, from, to, radius: spec.radii[name] });
      if (name === 'distal') {
        // The finger pad: the soft tissue on the palmar side of the distal
        // phalanx, which is what actually meets the key.
        const e = m.elements;
        const yAxis = new Vector3(e[4], e[5], e[6]);
        const zAxis = new Vector3(e[8], e[9], e[10]);
        pad = to.clone().addScaledVector(yAxis, -0.7 * spec.radii[name]).addScaledVector(zAxis, -0.25 * spec.lengths[name]);
      }
    };
    const joint = (name, flex, abd = 0) => {
      joints.push({ name: `${finger}.${name}`, finger, pos: origin() });
      if (abd) m.multiply(new Matrix4().makeRotationY(s * abd));
      m.multiply(new Matrix4().makeRotationX(flex));
    };

    if (finger === 'thumb') {
      // Carpometacarpal joint: flexion/extension sweeps in the plane of the
      // palm (about the dorsal axis), palmar abduction lifts the thumb out
      // of that plane (about the palm's transverse axis). The ray is then
      // pronated about its own axis so that MCP and IP flexion curl the
      // thumb toward the palm and the little finger.
      joints.push({ name: 'thumb.cmc', finger, pos: origin() });
      m.multiply(new Matrix4().makeRotationY(-s * angle('cmcFlex')));
      m.multiply(new Matrix4().makeRotationX(angle('cmcAbd')));
      m.multiply(new Matrix4().makeRotationZ(s * spec.pronation));
      bone('metacarpal');
      joint('mcp', angle('mcpFlex'));
      bone('proximal');
      joint('ip', angle('ipFlex'));
      bone('distal');
    } else {
      bone('metacarpal');
      joint('mcp', angle('mcpFlex'), angle('mcpAbd'));
      bone('proximal');
      joint('pip', angle('pipFlex'));
      bone('middle');
      joint('dip', angle('dipFlex'));
      bone('distal');
    }
    return { segments, joints, tip: pad, boneTip: segments[segments.length - 1].to };
  }

  // Contact point (finger pad) of one finger in world coordinates.
  fingerTip(finger, pose = this.pose, offset = this.offset) {
    return this.fingerChain(finger, pose, this.wristMatrix(pose, offset)).tip;
  }

  // Full skeleton in world coordinates.
  forwardKinematics(pose = this.pose) {
    const wrist = this.wristMatrix(pose);
    const segments = [];
    const joints = [];
    const tips = {};
    const pads = {};
    for (const finger of FINGERS) {
      const chain = this.fingerChain(finger, pose, wrist);
      segments.push(...chain.segments);
      joints.push(...chain.joints);
      tips[finger] = chain.boneTip;
      pads[finger] = chain.tip;
    }
    const carpals = CARPALS.map((c) => ({
      name: c.name,
      radius: c.radius,
      pos: new Vector3(this.s * c.pos[0], c.pos[1], c.pos[2]).applyMatrix4(wrist),
    }));
    const wristPos = new Vector3().setFromMatrixPosition(wrist);
    return { segments, joints, tips, pads, carpals, wrist: wristPos };
  }

  // Set the commanded joint angles; the realised pose includes the
  // anatomical couplings between fingers and the joint limits.
  setCommanded(commanded) {
    this.commanded = commanded;
    this.pose = applyConstraints(commanded);
  }

  tips() {
    const wrist = this.wristMatrix();
    const out = {};
    for (const finger of FINGERS) out[finger] = this.fingerChain(finger, this.pose, wrist).tip;
    return out;
  }
}
