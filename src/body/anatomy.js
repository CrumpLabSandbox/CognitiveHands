// Anatomical parameters for the hand and arm.
// Lengths are in metres, angles in radians. Numbers are averages for an
// adult hand; sources and caveats are listed in docs/anatomy.md.
//
// Hand-local frame (right hand): +Z distal (toward the fingertips),
// +Y dorsal (out of the back of the hand), +X radial (toward the thumb).
// The left hand is the mirror image: local X is negated and abduction
// angles are mirrored, so the same code serves both hands.

const mm = (v) => v / 1000;
export const deg = (v) => (v * Math.PI) / 180;

export const FINGERS = ['thumb', 'index', 'middle', 'ring', 'little'];

// The eight carpal bones, as a cluster of spheres around the wrist centre.
export const CARPALS = [
  { name: 'scaphoid', pos: [mm(13), mm(1), mm(11)], radius: mm(7) },
  { name: 'lunate', pos: [mm(1), mm(1), mm(9)], radius: mm(6.5) },
  { name: 'triquetrum', pos: [mm(-12), mm(0), mm(8)], radius: mm(6) },
  { name: 'pisiform', pos: [mm(-15), mm(-8), mm(7)], radius: mm(4.5) },
  { name: 'trapezium', pos: [mm(21), mm(-4), mm(23)], radius: mm(6) },
  { name: 'trapezoid', pos: [mm(12), mm(1), mm(26)], radius: mm(5.5) },
  { name: 'capitate', pos: [mm(1), mm(2), mm(26)], radius: mm(7.5) },
  { name: 'hamate', pos: [mm(-13), mm(-1), mm(24)], radius: mm(7) },
];

// Five rays: metacarpal base position relative to the wrist centre, the
// splay of the metacarpal in the palm plane (radial positive), bone
// lengths and drawing radii. The thumb ray is additionally pronated about
// its own axis so that flexion sweeps across the palm.
export const FINGER_SPECS = {
  thumb: {
    base: [mm(24), mm(-8), mm(20)],
    splay: deg(40),
    pronation: deg(-60),
    lengths: { metacarpal: mm(46), proximal: mm(31), distal: mm(22) },
    radii: { metacarpal: mm(7.5), proximal: mm(7), distal: mm(6) },
  },
  index: {
    base: [mm(22), mm(0), mm(33)],
    splay: deg(3),
    lengths: { metacarpal: mm(68), proximal: mm(40), middle: mm(24), distal: mm(18) },
    radii: { metacarpal: mm(6.5), proximal: mm(6.5), middle: mm(5.5), distal: mm(4.8) },
  },
  middle: {
    base: [mm(6), mm(1), mm(36)],
    splay: deg(-1),
    lengths: { metacarpal: mm(64), proximal: mm(44), middle: mm(27), distal: mm(19) },
    radii: { metacarpal: mm(6.5), proximal: mm(6.5), middle: mm(5.5), distal: mm(4.8) },
  },
  ring: {
    base: [mm(-8), mm(-1), mm(34)],
    splay: deg(-5),
    lengths: { metacarpal: mm(58), proximal: mm(41), middle: mm(25), distal: mm(18) },
    radii: { metacarpal: mm(6), proximal: mm(6), middle: mm(5.2), distal: mm(4.5) },
  },
  little: {
    base: [mm(-22), mm(-4), mm(30)],
    splay: deg(-10),
    lengths: { metacarpal: mm(54), proximal: mm(32), middle: mm(18), distal: mm(17) },
    radii: { metacarpal: mm(5.5), proximal: mm(5.5), middle: mm(4.8), distal: mm(4.2) },
  },
};

// Joint ranges of motion and a resting typing posture.
// Flexion is positive, extension negative. Abduction is positive toward
// the radial side. Wrist deviation is positive radial, negative ulnar.
const finger = (name, { mcp, abd, pip, dip, restMcp, restPip, restDip }) => ({
  [`${name}.mcpFlex`]: { min: deg(mcp[0]), max: deg(mcp[1]), rest: deg(restMcp) },
  [`${name}.mcpAbd`]: { min: deg(-abd), max: deg(abd), rest: 0 },
  [`${name}.pipFlex`]: { min: deg(pip[0]), max: deg(pip[1]), rest: deg(restPip) },
  [`${name}.dipFlex`]: { min: deg(dip[0]), max: deg(dip[1]), rest: deg(restDip) },
});

export const JOINT_SPECS = {
  'wrist.flex': { min: deg(-70), max: deg(80), rest: deg(-5) },
  'wrist.dev': { min: deg(-35), max: deg(20), rest: 0 },
  'thumb.cmcFlex': { min: deg(-20), max: deg(50), rest: deg(0) },
  'thumb.cmcAbd': { min: deg(-10), max: deg(60), rest: deg(15) },
  'thumb.mcpFlex': { min: deg(-10), max: deg(55), rest: deg(15) },
  'thumb.ipFlex': { min: deg(-15), max: deg(80), rest: deg(10) },
  ...finger('index', { mcp: [-25, 90], abd: 25, pip: [0, 105], dip: [-10, 85], restMcp: 25, restPip: 35, restDip: 15 }),
  ...finger('middle', { mcp: [-25, 90], abd: 15, pip: [0, 105], dip: [-10, 85], restMcp: 28, restPip: 38, restDip: 18 }),
  ...finger('ring', { mcp: [-25, 92], abd: 15, pip: [0, 108], dip: [-10, 88], restMcp: 30, restPip: 40, restDip: 20 }),
  ...finger('little', { mcp: [-30, 95], abd: 30, pip: [0, 110], dip: [-10, 90], restMcp: 30, restPip: 40, restDip: 20 }),
};

export const REST_POSE = Object.fromEntries(
  Object.entries(JOINT_SPECS).map(([id, spec]) => [id, spec.rest]),
);

// Finger enslaving: fraction of a master finger's flexion that appears in
// each slave finger because of shared muscle bellies (flexor digitorum
// profundus) and the juncturae tendinum between extensor tendons. Rows are
// masters, columns slaves. Values are scaled from force-enslaving data to
// the smaller coupling seen in unloaded motion.
export const ENSLAVING = {
  thumb: { index: 0.02, middle: 0.02, ring: 0.02, little: 0.02 },
  index: { thumb: 0.02, middle: 0.12, ring: 0.05, little: 0.02 },
  middle: { thumb: 0.02, index: 0.12, ring: 0.22, little: 0.08 },
  ring: { thumb: 0.02, index: 0.05, middle: 0.25, little: 0.3 },
  little: { thumb: 0.02, index: 0.02, middle: 0.08, ring: 0.3 },
};

// In unloaded finger flexion the DIP joint follows the PIP joint; the
// thumb IP joint follows its MCP joint.
export const DIP_PIP_RATIO = 0.6;
export const THUMB_IP_MCP_RATIO = 0.5;

// Signal-dependent noise (standard deviation grows with the size of the
// commanded change), plus a small constant floor.
export const MOTOR_NOISE = {
  joint: { constant: deg(0.3), proportional: 0.03 },
  offset: { constant: 0.0004, proportional: 0.03 },
};

// Arm segments and shoulder placement for a seated typist. The typist sits
// on the +Z side of the keyboard; the shoulder heights are relative to the
// key tops.
export const ARM = {
  upperArm: 0.3,
  forearm: 0.26,
  shoulder: { right: [0.2, 0.42, 0.5], left: [-0.2, 0.42, 0.5] },
  limits: {
    elbowFlex: [deg(0), deg(145)],
    pronation: [deg(-85), deg(90)],
    shoulderFlex: [deg(-60), deg(180)],
    shoulderAbd: [deg(0), deg(180)],
  },
};
