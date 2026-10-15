// Standard touch-typing finger assignment.

const ASSIGNMENT = {
  left: {
    little: ['`', '1', 'q', 'a', 'z', 'tab', 'caps', 'lshift'],
    ring: ['2', 'w', 's', 'x'],
    middle: ['3', 'e', 'd', 'c'],
    index: ['4', '5', 'r', 't', 'f', 'g', 'v', 'b'],
    thumb: [],
  },
  right: {
    index: ['6', '7', 'y', 'u', 'h', 'j', 'n', 'm'],
    middle: ['8', 'i', 'k', ','],
    ring: ['9', 'o', 'l', '.'],
    little: ['0', '-', '=', 'p', '[', ']', '\\', ';', "'", '/', 'enter', 'backspace', 'rshift'],
    thumb: ['space'],
  },
};

const LOOKUP = new Map();
for (const [hand, fingers] of Object.entries(ASSIGNMENT)) {
  for (const [finger, keys] of Object.entries(fingers)) {
    for (const k of keys) LOOKUP.set(k, { hand, finger });
  }
}

export function fingerFor(key) {
  return LOOKUP.get(key) ?? null;
}

// Where each finger rests between keystrokes.
export const HOME_KEYS = {
  left: { little: 'a', ring: 's', middle: 'd', index: 'f', thumb: 'space' },
  right: { index: 'j', middle: 'k', ring: 'l', little: ';', thumb: 'space' },
};

// Classify the transition between two consecutive keystrokes.
export function transitionClass(prevKey, key) {
  const a = fingerFor(prevKey);
  const b = fingerFor(key);
  if (!a || !b) return 'other';
  if (prevKey === key) return 'same key';
  if (a.hand !== b.hand) return 'alternate hand';
  if (a.finger !== b.finger) return 'same hand, different finger';
  return 'same finger, different key';
}

export const TRANSITION_CLASSES = [
  'alternate hand',
  'same hand, different finger',
  'same finger, different key',
  'same key',
];
