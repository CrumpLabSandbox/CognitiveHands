// Two-segment arm (upper arm, forearm) that follows the wrist wherever the
// hand goes. The shoulder is fixed; the elbow is solved analytically with a
// swivel that keeps it low and outboard, as in a seated typist.

import { Vector3 } from 'three';
import { ARM } from './anatomy.js';

export class Arm {
  constructor(side = 'right') {
    this.side = side;
    this.shoulder = new Vector3(...ARM.shoulder[side]);
    this.lateral = side === 'right' ? 1 : -1;
    this.elbow = new Vector3();
    this.wrist = new Vector3();
    this.elbowFlex = 0;
  }

  solve(wrist) {
    const L1 = ARM.upperArm;
    const L2 = ARM.forearm;
    const sw = new Vector3().subVectors(wrist, this.shoulder);
    let d = sw.length();
    const maxReach = L1 + L2 - 0.005;
    if (d > maxReach) {
      sw.multiplyScalar(maxReach / d);
      d = maxReach;
    }
    const u = sw.clone().normalize();
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    // Swivel direction: down and outward, made perpendicular to the
    // shoulder–wrist axis.
    const v = new Vector3(this.lateral * 0.6, -1, 0.15);
    const n = v.sub(u.clone().multiplyScalar(v.dot(u))).normalize();
    this.elbow.copy(this.shoulder).addScaledVector(u, a).addScaledVector(n, h);
    this.wrist.copy(this.shoulder).add(sw);
    const cosElbow = (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2);
    this.elbowFlex = Math.PI - Math.acos(Math.min(1, Math.max(-1, cosElbow)));
    return { shoulder: this.shoulder, elbow: this.elbow, wrist: this.wrist, elbowFlex: this.elbowFlex };
  }
}
