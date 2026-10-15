# Plan

Simulated hands and arms, driven by cognitive models of action sequencing, that
have to type on a real (simulated) keyboard. The question is whether models that
decide *what* to press and *when* can produce human-like timing and errors once
they also have to move a body.

Live demo: https://crumplabsandbox.github.io/CognitiveHands/

## Architecture

Four layers, each swappable, all in plain JavaScript modules so they run in the
browser and in Node (tests, batch runs):

```
cognitive  →  motor  →  body  →  instrument  →  feedback to cognitive
```

| Layer | Directory | What it does |
| --- | --- | --- |
| Cognitive | `src/cognitive/` | Decides which key to press next and how strongly upcoming keys are prepared. One class per model, common interface (`model.js`), listed in `registry.js`. |
| Motor | `src/motor/` | Turns "press J" into finger and hand movements: fingering, inverse kinematics, minimum-jerk trajectories, signal-dependent noise, anticipatory movement toward activated keys. |
| Body | `src/body/` | Kinematic skeleton: 27 bones per hand, forearm and upper arm, joint ranges, finger enslaving, DIP–PIP coupling. Parameters in `anatomy.js`. |
| Instrument | `src/instrument/` | QWERTY keyboard with real geometry (19.05 mm pitch, stagger, 4 mm travel, 2 mm actuation). A keystroke is a fingertip pad physically crossing the actuation depth. |
| Simulation | `src/sim/` | Fixed-step loop (400 Hz) that connects the layers; keystroke log; metrics against human benchmarks. |
| View | `src/view/` | Three.js skeleton and keyboard; controls built from each model's parameter spec. |

Only the view depends on the browser. `scripts/smoke.mjs` runs every model
headlessly and prints timing and error statistics.

## Stages

### Stage 1 — kinematic hands typing (this build)

- [x] 27-bone hand skeleton with anatomical joint axes and ranges, two-bone forearm drawn, humerus
- [x] Finger enslaving matrix, DIP follows PIP, thumb with CMC flexion/abduction and pronated ray
- [x] Resting posture solved from the keyboard (pitch, roll, finger curl) rather than hand-tuned
- [x] Keyboard with travel and actuation; adjacent-key slips, misses and accidental presses emerge from geometry
- [x] Motor layer: press-first IK planning, lift-over via points, min-jerk timing, Fitts-like durations, signal-dependent noise
- [x] Anticipation: idle fingers and the hand drift toward keys the cognitive layer is activating
- [x] Cognitive models: Rumelhart & Norman (1982), competitive queuing, hierarchical outer/inner loop, Minerva 2 instance model
- [x] Metrics: IKI by transition class vs. reference ranges, word-initial slowing, error taxonomy (adjacent substitution, transposition, omission, insertion, miss)
- [x] Browser UI with live parameters; GitHub Actions → Pages

Known simplifications to address next: no Shift (text is folded to lower case),
wrist joints are fixed, the arm only follows the wrist, no physics (contact is
geometric), muscles are not modelled.

### Stage 2 — contact physics

- Keys as physical objects with springs and bottoming-out; fingertip pads with
  compliance; the keystroke force profile.
- Candidate engines: MuJoCo (WASM build runs in the browser), Rapier (Rust/WASM,
  light), Ammo. Keep the kinematic path as a fallback and for fast batch runs.
- Wrist flexion/deviation and forearm pronation as controlled joints; arm IK
  that respects shoulder and elbow ranges.

### Stage 3 — muscles and tendons

- Hill-type muscles for the extrinsic flexors and extensors (FDP, FDS, EDC, EIP,
  EDM, FPL, EPL) and intrinsics (lumbricals, interossei, thenar group), with
  realistic activation delays and force–velocity properties.
- Tendon routing with moment arms per joint; enslaving then follows from shared
  muscle bellies rather than a matrix.
- Compare with MyoSuite / OpenSim hand models before building; import their
  parameters where licences allow.
- Fatigue and signal-dependent noise at the level of muscle activation.

### Stage 4 — richer cognition and learning

- More cognitive models: instance models beyond Minerva 2 (e.g. exemplar
  retrieval of whole sequences, Minerva-AL, instance theory of automaticity
  with power-law practice), chunking models, serial-order models with
  context signals (OSCAR, start–end), ACT-R style production models.
- Learned motor controllers (reinforcement learning on the same body) as an
  alternative to the hand-written motor layer; compare timing and error
  signatures.
- Error detection and correction (backspacing), and the posterror slowing seen
  in humans.

### Stage 5 — piano

- A keyboard instrument with weighted keys and velocity; fingering choice,
  timing evenness, speed limits of passages; comparison with RoboPianist-style
  benchmarks.

## Testing against people

- Human reference ranges for IKI by transition class are placeholders from the
  literature (`src/sim/metrics.js`). Replace them with estimates from the
  Typing Science Platform, and add distributions (not just means) so the
  simulation can be scored against them.
- Benchmarks to add: alternate-hand advantage, same-finger cost, word-initial
  slowing, letter-frequency and bigram effects, error types and their relative
  frequencies, the timing of errors (slowing before and after).

## Open questions

- Typing first (yes, for now) — piano after contact physics.
- Which cognitive models first — the four here are a spread: parallel activation
  (R&N), competitive queuing, hierarchical control, instance retrieval. Minerva 2
  is the hook for instance-model exploration.
- How much of the motor layer should be learned vs. specified — the controller
  interface (`request`/`update`) is the seam to put a learned policy behind.
- Success criterion — the metrics panel reports both task completion and the
  human-likeness of timing and errors; the latter is the interesting one.
