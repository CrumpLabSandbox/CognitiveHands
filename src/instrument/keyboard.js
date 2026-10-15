// A keyboard whose keys are pressed by fingertips crossing the actuation
// depth. Pressing a key is a physical event: whichever key the fingertip
// actually lands on registers, so slips onto neighbouring keys and misses
// come out of the body, not out of a label.

import { Vector3 } from 'three';
import { buildLayout, PITCH, KEY_TRAVEL, KEY_ACTUATION } from './layout.js';

const RELEASE_HYSTERESIS = 0.0005;

export class Keyboard {
  constructor() {
    this.keys = buildLayout().map((k) => ({
      ...k,
      center: new Vector3(k.x, 0, k.z),
      depth: 0,
      pressed: false,
      pressedBy: null,
      travel: KEY_TRAVEL,
      actuation: KEY_ACTUATION,
    }));
    this.byId = new Map(this.keys.map((k) => [k.id, k]));
  }

  key(id) {
    return this.byId.get(id);
  }

  keyCenter(id) {
    return this.byId.get(id)?.center;
  }

  // The key whose cell contains the point (x, z), or null. Cells tile the
  // board without gaps, since a fingertip pad is wider than the gap between
  // caps.
  keyAt(x, z) {
    for (const k of this.keys) {
      if (Math.abs(z - k.z) <= PITCH / 2 && Math.abs(x - k.x) <= k.width / 2) return k;
    }
    return null;
  }

  // Distance between two keys in units of key pitch.
  distance(a, b) {
    const ka = this.byId.get(a);
    const kb = this.byId.get(b);
    if (!ka || !kb) return Infinity;
    return Math.hypot(ka.x - kb.x, ka.z - kb.z) / PITCH;
  }

  // Update key depths from fingertip positions. `tips` is a list of
  // { hand, finger, pos }. Returns press and release events.
  update(tips, time) {
    const events = [];
    const depths = new Map();
    for (const tip of tips) {
      const y = tip.pos.y;
      if (y >= 0 || y < -0.03) continue;
      const k = this.keyAt(tip.pos.x, tip.pos.z);
      if (!k) continue;
      const depth = Math.min(k.travel, -y);
      const current = depths.get(k.id);
      if (!current || depth > current.depth) depths.set(k.id, { depth, tip });
    }
    for (const k of this.keys) {
      const d = depths.get(k.id);
      k.depth = d ? d.depth : 0;
      if (!k.pressed && k.depth >= k.actuation) {
        k.pressed = true;
        k.pressedBy = { hand: d.tip.hand, finger: d.tip.finger };
        events.push({ type: 'down', key: k.id, hand: d.tip.hand, finger: d.tip.finger, time });
      } else if (k.pressed && k.depth < k.actuation - RELEASE_HYSTERESIS) {
        k.pressed = false;
        events.push({ type: 'up', key: k.id, ...k.pressedBy, time });
        k.pressedBy = null;
      }
    }
    return events;
  }
}
