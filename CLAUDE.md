# CognitiveHands

Simulated hands and arms driven by cognitive models of action sequencing,
typing on a simulated keyboard. Plain ES modules, Three.js for the view, Vite
for the build, Vitest for tests. Deployed to GitHub Pages by
`.github/workflows/deploy.yml` on every push to `main`.

## Commands

- `npm install`
- `npm test` — unit tests plus an end-to-end check that each model types a sentence
- `node scripts/smoke.mjs "some text"` — headless run of every model with timing and error statistics
- `npm run dev` / `npm run build` (set `GITHUB_ACTIONS=1` to build with the Pages base path)

## Layout

- `src/body/` skeleton and constraints — anatomical parameters in `anatomy.js`, documented in `docs/anatomy.md`
- `src/instrument/` keyboard geometry and key actuation
- `src/motor/` fingering, inverse kinematics, trajectories, the controller
- `src/cognitive/` one file per model; add a model by implementing `SequencingModel` and listing it in `registry.js` (see `docs/models.md`)
- `src/sim/` the simulation loop and metrics
- `src/view/` Three.js scene and the control panel
- `PLAN.md` staged roadmap and open questions

## Conventions

- Units: metres, seconds, radians. Angles in `anatomy.js` are written with `deg()`.
- Flexion positive, extension negative; abduction positive toward the radial side.
- Hand-local frame: +Z distal, +Y dorsal, +X radial (right hand); the left hand mirrors X.
- Anything the view does not need should run in Node too, so tests and batch runs stay headless.
- When changing body parameters or the motor planner, run `node scripts/smoke.mjs` and check that every model still types the sentence with no misses or accidental presses before committing.
