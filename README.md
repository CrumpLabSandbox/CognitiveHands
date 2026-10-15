# Simulated Hands for Action Sequencing Models

> An anatomically detailed 3D simulation of human hands and arms, driven by cognitive models of action sequencing, to test whether those models can actually play piano or type when they have to control a real body.

- **Status:** seed
- **Tags:** research, typing, simulation
- **Created:** 2026-10-15
- **Updated:** 2026-10-15

## What

A simulation of human hands and arms connected to cognitive models of action sequencing. The test: can hands controlled by these models accomplish skilled tasks like playing piano or typing?

- **Maximum detail.** The hands should have as much detail as possible in their 3D simulation.
- **Respect what is known.** The simulation should respect everything that is known about hands and arms and how they work.

## Why

Cognitive models of typing and other action sequences usually stop at deciding which action comes next and when. They rarely have to move a body. Many of the most informative facts about skilled performance come from the body: which finger is used, how far it travels, which fingers cannot move independently, and how the next movement starts before the current one ends. Connecting the models to realistic hands turns these into real tests. A model that cannot produce human-like timing and errors once it controls real hands is missing something.

## How

Early thoughts, to refine in a workshop:

### The body

- **Skeleton.** The 27 bones of each hand, plus the wrist, forearm, elbow, and shoulder, with realistic joint axes, ranges of motion, masses, and inertia.
- **Muscles and tendons.** Forearm muscles that act on the fingers through long tendons, and the small muscles inside the hand, with realistic force, speed, and activation delays.
- **Known constraints.** Fingers are not fully independent; the ring finger, for example, is partly tied to its neighbors. Finger joints move together in typical patterns. Motor commands carry noise that grows with force. Muscles fatigue.
- **The instrument.** Piano keys and keyboard keys with realistic travel, force, and contact, so pressing a key is a physical event, not a label.

### Layers between mind and hand

- **Cognitive layer.** Sequencing models decide what to press and in what order. Candidates include hierarchical models of typing with an outer loop for words and an inner loop for keystrokes, competitive queuing models, and the classic Rumelhart and Norman typing simulation, which already moved simple hands.
- **Motor layer.** Something must turn "press J now" into a trajectory and muscle commands. Options range from simple targeting with inverse kinematics, to optimal feedback control, to controllers trained with reinforcement learning.
- **Keep the layers swappable,** so different cognitive models can be compared on the same body.

### Building on existing tools

Several open-source projects are close to parts of this and should be checked before building from scratch. Examples include the MuJoCo physics engine, musculoskeletal hand and arm models such as those in MyoSuite and OpenSim, and RoboPianist, where simulated robot hands learned to play piano. A browser view with a 3D graphics library could show the results.

### Testing against people

- **Typing benchmarks.** Compare simulated keystroke timing with human data: interval distributions, the speed advantage when consecutive letters use alternate hands, slower same-finger sequences, typical error types such as neighboring-key slips and letter swaps, and fingers starting toward upcoming keys early.
- **Data source.** The Typing Science Platform could supply large amounts of human keystroke data for these comparisons.
- **Piano benchmarks.** Fingering choices, timing evenness, and the speed limits of fast passages.

### Staging

Full anatomical fidelity is a research-scale goal, so build in stages: first an accurate skeleton with joint limits and a 3D view; then physics with contact on a keyboard; then muscles and tendons; then cognitive models in control. Each stage is useful on its own.

## Open questions

- Typing first or piano first? Typing connects directly to the user's research and to existing data.
- Which cognitive models of action sequencing should be connected first?
- How much of the motor layer should be learned, for example by reinforcement learning, and how much specified by theory?
- Which existing simulation tools fit best, and can the result also run in a browser for demos?
- What would count as the model succeeding: completing the task, or matching human timing and error patterns?
- Are there collaborators in biomechanics or motor control who would want to join?

## Notes

- 2026-10-15: Captured from chat as a seed. The user wants a simulation of human hands and arms connected to cognitive models of action sequencing, to see whether hands controlled by these models can accomplish tasks like playing piano or typing. The hands should have the most possible detail in their 3D simulation and respect everything known about how hands and arms work.
- 2026-10-15: Recorded maximum fidelity as the goal, with a staged path, since a complete musculoskeletal hand under cognitive control is research-scale work. Existing tools to check are listed in the description.

## Links

- Human data: Typing Science Platform
- Related: Evaluating the Logical Structure of Theories
- Related: Experiment Design Testbed
- Related: Natural MPE Pairings
