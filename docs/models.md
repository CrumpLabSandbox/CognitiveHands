# Cognitive models

Every model implements the interface in `src/cognitive/model.js`:

```js
class MyModel extends SequencingModel {
  static id = 'my-model';
  static label = 'My model (Author year)';
  static description = 'One line for the UI.';
  static params = { rate: param(defaultValue, min, max, step, 'Label') };

  reset(keys) {}            // the key sequence to type, e.g. ['t','h','e','space']
  step(dt, feedback) {      // called at 400 Hz
    return {
      activations: { h: 0.6, e: 0.3 },   // 0..1 per key: preparation of upcoming keys
      launch: ['t'],                     // keystrokes to commit now
      done: false,
      trace: {},                         // anything the UI should show
    };
  }
}
```

`feedback.completed` lists keystrokes whose press just bottomed out:
`{ intended, actual, hand, finger, time, latency }` — `actual` is the key the
finger really hit (null for a miss), so a model can be given veridical or
intended feedback as the theory requires. Register the class in
`registry.js` and it appears in the UI with sliders for its `params`.

The motor layer uses `activations` to move idle fingers (and, when the hand is
free, the whole hand) toward upcoming keys before they are launched. That is
how the models' parallelism shows up in the body.

## Rumelhart & Norman (1982) — `rumelhart-norman`

*Simulating a skilled typist: a study of skilled cognitive-motor performance.*
Cognitive Science, 6, 1–36.

Keypress schemata for the next `window` letters are activated by the word in
parallel. Each schema inhibits the schemata of letters after it
(`inhibition`), producing an activation gradient that encodes order. Each
schema's activation follows `da/dt = rate · (1 − a − inhibition · Σ earlier a)`
plus Gaussian noise. A keystroke is launched when its activation crosses
`threshold`; when the press completes, the schema is deactivated, releasing
inhibition on later letters. Up to `maxPending` keystrokes can be in flight,
so with noise a later letter occasionally launches early — a transposition if
its finger gets there first. Activations below threshold are passed to the
motor layer, pulling fingers toward upcoming keys as in the original model.

Not yet included from the original: the doubling schema (`bokk` errors), and
response-triggering by finger arrival rather than threshold.

## Competitive queuing — `competitive-queuing`

Grossberg (1978); Houghton (1990), *The problem of serial order: a neural
network model of sequence learning and recall*; Bullock & Rhodes (2003).

A planning layer holds the next `window` items with a primacy gradient
(`rho^position`); a competitive choice layer picks the maximum after adding
Gaussian noise (`noise`), outputs it, and suppresses it so the next can win.
Selection happens `latency` (± `latencySd`) seconds after the previous
keystroke completes (or after the previous launch when `maxPending` > 1).
Produces the classic locality of transposition errors: items swap with near
neighbours far more often than with distant ones.

## Hierarchical outer/inner loop — `hierarchical-two-loop`

Logan & Crump (2011), *Hierarchical control of cognitive processes: the case for
skilled typewriting*. Psychology of Learning and Motivation, 54, 1–27.

The outer loop works with words: it delivers one word at a time to the inner
loop after `outerLatency`, and starts fetching the next word when `lookahead`
letters of the current one remain. The inner loop types each word as a
competitive queue over its letters with its own faster timing
(`innerLatency`). When the outer loop is late, the first keystroke of the word
waits — word-initial slowing. The outer loop never sees keystrokes, only
words; the inner loop never sees beyond the current word (and the first letter
of the next, if ready).

## Minerva 2 — `minerva2`

Hintzman (1984, 1986), *MINERVA 2: a simulation model of human memory*;
*"Schema abstraction" in a multiple-trace memory model*. The retrieval-time
reading follows Logan's (1988) instance theory of automaticity and Jamieson and
colleagues' Minerva-based response-time models.

Memory is a list of traces, each encoding (with probability `learningRate` per
feature) the letter to type, the letter before it, and the key that was
pressed. Before typing, the text is practised `practice` times. To type a
letter the model probes memory with the letter and its context; each trace is
activated by the cube of its similarity (`letterWeight` weights the letter
feature against the context feature); the echo's response part says which key
to press, and the echo intensity sets retrieval time:
`rt = rtBase + rtScale / (1 + intensity)`. More practice → more traces →
stronger echo → faster keystrokes, with diminishing returns. Weak or
conflicting echoes yield slower and occasionally wrong responses (a cognitive
substitution, distinct from a motor slip). With `learnOnline`, each completed
keystroke is stored as a new trace — including errors.

Ways to extend it here:

- Make the probe richer (two letters of context, position in word, word
  identity) and see which context sensitivities match human IKI patterns.
- Retrieve the *finger movement* rather than the key, or a whole chunk
  (bigram, word) and emit several launches at once — an instance account of
  chunking.
- Replace cubic activation with a parameter, add feature noise at retrieval,
  or forgetting, and fit retrieval-time parameters to Typing Science Platform
  data.
- Add a race between retrieval and an algorithmic letter→key route (Logan 1988)
  to model the transition from hunt-and-peck to touch typing.

## Comparing models on the same body

Keep the motor parameters fixed and swap the cognitive model; the metrics
panel then isolates what the cognitive layer contributes. In particular,
alternate-hand speed advantages and same-finger costs come from the body and
should appear with every model; word-initial slowing and the structure of
transposition errors are where models differ.
