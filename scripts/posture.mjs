// Search hand placement (pitch, roll, anchor pose) for a natural resting posture
// in which all four fingers hover over their home keys.
import { Vector3, Quaternion } from 'three';
import { Hand } from '../src/body/hand.js';
import { Keyboard } from '../src/instrument/keyboard.js';
import { REST_POSE, deg } from '../src/body/anatomy.js';
import { solveFingerIK } from '../src/motor/ik.js';
import { HOME_KEYS } from '../src/motor/fingering.js';
const kb = new Keyboard();
const X = new Vector3(1,0,0), Y = new Vector3(0,1,0), Z = new Vector3(0,0,1);
const comfy = { mcpFlex: 30, pipFlex: 40, dipFlex: 24 };
const results = [];
for (let pitch = 5; pitch <= 40; pitch += 5) for (let roll = 0; roll <= 25; roll += 5) for (const anchorMcp of [20, 30, 40]) for (const anchorPip of [30, 45, 60]) {
  const hand = new Hand('right'); const s = 1;
  hand.baseQuaternion.setFromAxisAngle(X, -deg(pitch)).multiply(new Quaternion().setFromAxisAngle(Z, -s*deg(roll))).multiply(new Quaternion().setFromAxisAngle(Y, Math.PI));
  const pose = { ...REST_POSE, 'middle.mcpFlex': deg(anchorMcp), 'middle.pipFlex': deg(anchorPip), 'middle.dipFlex': deg(anchorPip*0.6) };
  const tip = hand.fingerTip('middle', pose, new Vector3());
  const home = kb.keyCenter('k').clone(); home.y += 0.008;
  hand.basePosition.copy(home.sub(tip));
  let score = 0; const detail = [];
  for (const f of ['index','middle','ring','little']) {
    const t = kb.keyCenter(HOME_KEYS.right[f]).clone(); t.y += 0.008;
    const sol = solveFingerIK(hand, f, t, { pose: { ...pose }, offset: new Vector3(), lockOffset: true, tolerance: { x: 0.004, z: 0.004 } });
    score += 1e6 * sol.error * sol.error;
    for (const j of ['mcpFlex','pipFlex','dipFlex']) { const d = sol.joints[`${f}.${j}`]/Math.PI*180 - comfy[j]; score += d*d; }
    detail.push(`${f}: ${['mcpFlex','mcpAbd','pipFlex','dipFlex'].map(j => (sol.joints[`${f}.${j}`]*180/Math.PI).toFixed(0)).join('/')} e${(sol.error*1000).toFixed(1)}`);
  }
  // also require the thumb to be able to press space
  results.push({ pitch, roll, anchorMcp, anchorPip, score, detail, base: hand.basePosition.toArray().map(v=>(v*1000).toFixed(0)).join(',') });
}
results.sort((a,b)=>a.score-b.score);
for (const r of results.slice(0, 8)) console.log(r.score.toFixed(0), `pitch ${r.pitch} roll ${r.roll} anchor ${r.anchorMcp}/${r.anchorPip}`, r.base, r.detail.join(' | '));
