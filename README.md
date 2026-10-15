# Cognitive Hands

> An anatomically detailed 3D simulation of human hands and arms, driven by cognitive models of action sequencing, to test whether those models can actually type (and later play piano) when they have to control a real body.

**Live demo:** https://crumplabsandbox.github.io/CognitiveHands/

- **Status:** stage 1 built — kinematic hands typing under four cognitive models
- **Tags:** research, typing, simulation
- **Created:** 2026-10-15

## What is here

```
cognitive model  →  motor layer  →  hands & arms  →  keyboard  →  feedback
```

- **Body** (`src/body/`): 27 bones per hand with anatomical joint axes and ranges, finger enslaving, DIP–PIP coupling, fingertip pads, a two-bone forearm and humerus. Parameters and sources in [docs/anatomy.md](docs/anatomy.md).
- **Instrument** (`src/instrument/`): a QWERTY keyboard with real geometry; a keystroke is a fingertip crossing 2 mm of a 4 mm key travel, so slips onto neighbouring keys and misses come from the body.
- **Motor layer** (`src/motor/`): standard fingering, press-first inverse kinematics, minimum-jerk reaches with Fitts-like durations, signal-dependent noise, and anticipatory movement of idle fingers toward keys the cognitive layer is preparing.
- **Cognitive models** (`src/cognitive/`): Rumelhart & Norman (1982) activation schemata, competitive queuing, Logan & Crump's hierarchical outer/inner loop, and a Minerva 2 instance model of the letter→key mapping. One interface, swappable on the same body; see [docs/models.md](docs/models.md) for how to add one.
- **Metrics** (`src/sim/metrics.js`): inter-keystroke intervals by transition class (alternate hand, same hand, same finger, repeat) against reference ranges, word-initial slowing, and an error taxonomy (adjacent-key substitution, transposition, omission, insertion, miss).

The roadmap — contact physics, muscles and tendons, more models and learned controllers, piano — is in [PLAN.md](PLAN.md).

## Run it

```sh
npm install
npm run dev          # browser UI at http://localhost:5173
npm test             # unit tests + each model typing a sentence end to end
node scripts/smoke.mjs "the quick brown fox"   # headless run of every model with statistics
```

Pushes to `main` run the tests, build, and deploy to GitHub Pages.

## Why

Cognitive models of typing and other action sequences usually stop at deciding which action comes next and when. They rarely have to move a body. Many of the most informative facts about skilled performance come from the body: which finger is used, how far it travels, which fingers cannot move independently, and how the next movement starts before the current one ends. Connecting the models to realistic hands turns these into real tests. A model that cannot produce human-like timing and errors once it controls real hands is missing something.

## Design principles

- **Maximum detail.** The hands should have as much detail as possible in their 3D simulation.
- **Respect what is known.** The simulation should respect everything that is known about hands and arms and how they work.
- **Swappable layers.** Different cognitive models (and later, different motor controllers) are compared on the same body.
- **Stage it.** Each stage is useful on its own: skeleton with joint limits and a 3D view; contact on a keyboard; muscles and tendons; cognitive models in control.

## Testing against people

- **Typing benchmarks.** Compare simulated keystroke timing with human data: interval distributions, the speed advantage when consecutive letters use alternate hands, slower same-finger sequences, typical error types such as neighbouring-key slips and letter swaps, and fingers starting toward upcoming keys early.
- **Data source.** The Typing Science Platform could supply large amounts of human keystroke data for these comparisons; the reference ranges in the metrics panel are literature placeholders until then.
- **Piano benchmarks.** Fingering choices, timing evenness, and the speed limits of fast passages.

## Open questions

- Which cognitive models of action sequencing should be connected next? Instance models (Minerva variants, exemplar retrieval of chunks) are the first candidates.
- How much of the motor layer should be learned, for example by reinforcement learning, and how much specified by theory?
- Which physics engine fits best for contact and muscles while still running in a browser for demos?
- What counts as the model succeeding: completing the task, or matching human timing and error patterns?
- Are there collaborators in biomechanics or motor control who would want to join?

## Notes

- 2026-10-15: Captured from chat as a seed. The user wants a simulation of human hands and arms connected to cognitive models of action sequencing, to see whether hands controlled by these models can accomplish tasks like playing piano or typing. The hands should have the most possible detail in their 3D simulation and respect everything known about how hands and arms work.
- 2026-10-15: Recorded maximum fidelity as the goal, with a staged path, since a complete musculoskeletal hand under cognitive control is research-scale work.
- 2026-10-15: Stage 1 built: kinematic 27-bone hands, keyboard with actuation, motor layer, four cognitive models, metrics, browser UI, Pages deployment.

## Links

- Human data: Typing Science Platform
- Related: Evaluating the Logical Structure of Theories
- Related: Experiment Design Testbed
- Related: Natural MPE Pairings
