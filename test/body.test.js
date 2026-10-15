import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { Hand } from '../src/body/hand.js';
import { REST_POSE, JOINT_SPECS, FINGERS } from '../src/body/anatomy.js';
import { applyEnslaving, clampPose } from '../src/body/constraints.js';
import { Arm } from '../src/body/arm.js';

describe('hand skeleton', () => {
  it('has 27 bones per hand', () => {
    const fk = new Hand('right').forwardKinematics();
    expect(fk.segments.length + fk.carpals.length).toBe(27);
    const bone = (s) => s.name.split('.')[1];
    expect(fk.segments.filter((s) => bone(s) === 'metacarpal').length).toBe(5);
    expect(fk.segments.filter((s) => ['proximal', 'middle', 'distal'].includes(bone(s))).length).toBe(14);
  });

  it('places fingertips in front of the wrist, with the thumb radial', () => {
    const hand = new Hand('right');
    const fk = hand.forwardKinematics();
    for (const f of FINGERS) expect(fk.tips[f].z).toBeGreaterThan(fk.wrist.z + 0.05);
    expect(fk.tips.thumb.x).toBeGreaterThan(fk.tips.index.x);
    expect(fk.tips.index.x).toBeGreaterThan(fk.tips.little.x);
  });

  it('mirrors the left hand exactly', () => {
    const right = new Hand('right').forwardKinematics();
    const left = new Hand('left').forwardKinematics();
    for (const f of FINGERS) {
      expect(left.tips[f].x).toBeCloseTo(-right.tips[f].x, 9);
      expect(left.tips[f].y).toBeCloseTo(right.tips[f].y, 9);
      expect(left.tips[f].z).toBeCloseTo(right.tips[f].z, 9);
    }
  });

  it('flexion lowers the fingertip toward the palm', () => {
    const hand = new Hand('right');
    const rest = hand.fingerTip('index', REST_POSE, new Vector3());
    const flexed = hand.fingerTip('index', { ...REST_POSE, 'index.mcpFlex': REST_POSE['index.mcpFlex'] + 0.5 }, new Vector3());
    expect(flexed.y).toBeLessThan(rest.y);
  });
});

describe('constraints', () => {
  it('clamps joints to their ranges', () => {
    const pose = clampPose({ ...REST_POSE, 'index.pipFlex': 10, 'index.mcpFlex': -10 });
    expect(pose['index.pipFlex']).toBe(JOINT_SPECS['index.pipFlex'].max);
    expect(pose['index.mcpFlex']).toBe(JOINT_SPECS['index.mcpFlex'].min);
  });

  it('flexing the ring finger drags the little and middle fingers along', () => {
    const cmd = { ...REST_POSE, 'ring.mcpFlex': REST_POSE['ring.mcpFlex'] + 1 };
    const out = applyEnslaving(cmd);
    expect(out['little.mcpFlex']).toBeGreaterThan(REST_POSE['little.mcpFlex']);
    expect(out['middle.mcpFlex']).toBeGreaterThan(REST_POSE['middle.mcpFlex']);
    expect(out['little.mcpFlex'] - REST_POSE['little.mcpFlex']).toBeGreaterThan(out['index.mcpFlex'] - REST_POSE['index.mcpFlex']);
  });
});

describe('arm', () => {
  it('reaches a wrist position with both segments at their lengths', () => {
    const arm = new Arm('right');
    const wrist = new Vector3(0.1, 0.09, 0.12);
    const { shoulder, elbow } = arm.solve(wrist);
    expect(shoulder.distanceTo(elbow)).toBeCloseTo(0.3, 6);
    expect(elbow.distanceTo(wrist)).toBeCloseTo(0.26, 6);
    expect(elbow.y).toBeLessThan(shoulder.y);
  });
});
