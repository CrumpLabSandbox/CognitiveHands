# Anatomy in the model

All numbers live in `src/body/anatomy.js`. They are averages for an adult hand
and are meant to be revised; this file records where they come from and what
they leave out.

## Frames and conventions

Hand-local frame (right hand): +Z distal (toward the fingertips), +Y dorsal
(out of the back of the hand), +X radial (toward the thumb). The left hand is
the mirror image: local X is negated and abduction angles are mirrored, so one
set of parameters serves both hands.

Flexion is positive, extension negative. Abduction is positive toward the
radial side. Wrist deviation is positive radial, negative ulnar.

## Bones (27 per hand)

- **Carpals (8):** scaphoid, lunate, triquetrum, pisiform, trapezium, trapezoid,
  capitate, hamate. Drawn as spheres at approximate positions around the wrist
  centre; rigid in this version (the midcarpal joint is not modelled).
- **Metacarpals (5):** bases around 30–36 mm distal of the wrist centre, fanning
  out at 3°, −1°, −5°, −10° (index → little) in the palm plane. The thumb
  metacarpal starts at the trapezium, splayed 40° radially.
- **Phalanges (14):** lengths (mm) — thumb 31/22; index 40/24/18; middle
  44/27/19; ring 41/25/18; little 32/18/17. Metacarpals: 46, 68, 64, 58, 54.

Sources for lengths: averaged from radiographic studies of adult hands (e.g.
Buryanov & Kotiuk 2010, *Proportions of hand segments*; Alexander & Viktor 2010)
and the hand anthropometry summarised by Greiner (1991). Values are rounded.

## Joints and ranges (degrees)

| Joint | Range | Rest (typing) |
| --- | --- | --- |
| Wrist flexion / extension | −70 … 80 | −5 |
| Wrist radial / ulnar deviation | −35 … 20 | 0 |
| Finger MCP flexion | −25 … 90 (little −30 … 95) | 25–30 |
| Finger MCP abduction | ±25 index, ±15 middle/ring, ±30 little | 0 |
| PIP flexion | 0 … 105–110 | 35–40 |
| DIP flexion | −10 … 85–90 | 15–20 |
| Thumb CMC flexion (in palm plane) | −20 … 50 | 0 |
| Thumb CMC palmar abduction | −10 … 60 | 15 |
| Thumb MCP flexion | −10 … 55 | 15 |
| Thumb IP flexion | −15 … 80 | 10 |
| Elbow flexion | 0 … 145 | — |
| Forearm pronation / supination | −85 … 90 | — |

Ranges follow the American Academy of Orthopaedic Surgeons norms and the
clinical ranges tabulated in Kapandji's *Physiology of the Joints*. Finger
CMC joints are treated as fixed (the fourth and fifth have a few degrees of
mobility in reality).

### Thumb

The thumb ray is modelled with a carpometacarpal joint whose flexion/extension
sweeps in the plane of the palm (about the dorsal axis) and whose palmar
abduction lifts the thumb out of the palm plane (about the palm's transverse
axis). The ray is then pronated 60° about its own axis so that MCP and IP
flexion curl the thumb across the palm toward the little finger. This is a
two-axis simplification of the saddle joint; true CMC kinematics include
coupled axial rotation.

## Couplings

- **Enslaving.** Flexing one finger moves its neighbours because the flexor
  digitorum profundus has shared muscle bellies and the extensor tendons are
  tied together by the juncturae tendinum. The matrix in `anatomy.js` has the
  ring finger most strongly tied to the middle (0.25) and little (0.30) fingers,
  index–middle at 0.12, and the thumb nearly independent. Values are scaled down
  from the *force* enslaving measured by Zatsiorsky, Li & Latash (2000,
  *Experimental Brain Research*) to the smaller coupling seen in unloaded
  motion; a direct measurement of kinematic enslaving during typing would
  replace them.
- **DIP follows PIP** at a ratio of 0.6 in unloaded flexion (Hahn et al. 1995);
  the thumb IP is independently driven (flexor pollicis longus).

The inverse-kinematics solver evaluates the fingertip on the *realised* pose,
so planned keystrokes already compensate for enslaving, as a skilled typist's
do.

## Motor noise

Signal-dependent noise (Harris & Wolpert 1998): the standard deviation of the
planned endpoint grows with the size of the commanded change (3 % of the joint
displacement, plus a 0.3° floor; 3 % of hand translation plus 0.4 mm). Long
reaches to the number row therefore miss more often than home-row keys.

## Resting posture

The hand is pitched 15° toward the keys and rolled 17.5° so that the little-
finger side sits lower — forearms in typing are not fully pronated. The middle
finger's pad at actuation depth with MCP 28°, PIP 55°, DIP 33° anchors the
placement; the other fingers' home postures are then solved by inverse
kinematics. `scripts/posture.mjs` is the search that produced these numbers.
Resulting home postures: index 25/50/30, middle 15/64/38, ring 15/56/34, little
15/28/17 (MCP/PIP/DIP).

## Fingertip pad

The contact point is the soft tissue on the palmar side of the distal phalanx,
0.7 radii palmar of the bone axis and a quarter of the phalanx back from its
tip, not the bony tip.

## Arm

Upper arm 0.30 m, forearm 0.26 m, shoulders at ±0.20 m lateral, 0.42 m above
the key tops and 0.50 m behind the home row. The elbow is solved analytically
with a swivel that keeps it low and outboard. Radius and ulna are drawn
separately for the picture; they do not yet carry pronation.

## Not yet modelled

Muscles and tendons, skin and soft tissue beyond the pad, palmar arch
deformation, midcarpal and finger CMC mobility, thumb CMC axial rotation,
fatigue, individual differences in hand size.
