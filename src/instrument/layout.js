// ANSI QWERTY geometry. Units: metres. The home row (asdf) sits at z = 0
// and the typist sits on the +Z side; rows further from the typist have
// negative z. Key tops are at y = 0 when not pressed.

export const PITCH = 0.01905; // 3/4 inch centre-to-centre
export const KEY_TRAVEL = 0.004;
export const KEY_ACTUATION = 0.002;
export const KEY_FORCE = 0.6; // newtons at actuation (≈60 gf)
export const KEY_CAP = 0.015; // top surface width
export const KEY_HEIGHT = 0.008;

// The home row starts so that the gap between g and h is at x = 0.
const HOME_START = -4.5 * PITCH;

const rows = [
  { z: -2 * PITCH, start: HOME_START - 0.75 * PITCH, keys: '`1234567890-=', tail: [{ id: 'backspace', label: '⌫', units: 2 }] },
  { z: -1 * PITCH, start: HOME_START - 0.25 * PITCH, keys: 'qwertyuiop[]', head: [{ id: 'tab', label: 'tab', units: 1.5 }], tail: [{ id: '\\', label: '\\', units: 1.5 }] },
  { z: 0, start: HOME_START, keys: "asdfghjkl;'", head: [{ id: 'caps', label: 'caps', units: 1.75 }], tail: [{ id: 'enter', label: 'enter', units: 2.25 }] },
  { z: PITCH, start: HOME_START + 0.5 * PITCH, keys: 'zxcvbnm,./', head: [{ id: 'lshift', label: 'shift', units: 2.25 }], tail: [{ id: 'rshift', label: 'shift', units: 2.75 }] },
];

export function buildLayout() {
  const keys = [];
  for (const row of rows) {
    // Head keys (tab, caps, shift) sit to the left of the first character key.
    for (const k of row.head ?? []) {
      const w = k.units * PITCH;
      keys.push({ id: k.id, label: k.label, x: row.start - PITCH / 2 - w / 2, z: row.z, width: w, typable: false });
    }
    let cx = row.start;
    for (const ch of row.keys) {
      keys.push({ id: ch, label: ch, x: cx, z: row.z, width: PITCH, typable: true });
      cx += PITCH;
    }
    for (const k of row.tail ?? []) {
      const w = k.units * PITCH;
      keys.push({ id: k.id, label: k.label, x: cx - PITCH / 2 + w / 2, z: row.z, width: w, typable: k.id === 'enter' });
      cx += w;
    }
  }
  keys.push({ id: 'space', label: '', x: 0, z: 2 * PITCH, width: 6.25 * PITCH, typable: true });
  return keys;
}

export const TYPABLE_KEYS = new Set(buildLayout().filter((k) => k.typable).map((k) => k.id));

// Map a character of text to the key that types it (lower case only for now;
// Shift is a later stage).
export function charToKey(ch) {
  if (ch === ' ') return 'space';
  if (ch === '\n') return 'enter';
  const lower = ch.toLowerCase();
  if (TYPABLE_KEYS.has(lower)) return lower;
  const shifted = {
    '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
    _: '-', '+': '=', '{': '[', '}': ']', '|': '\\', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/', '~': '`',
  };
  return shifted[ch] ?? null;
}

export function textToKeys(text) {
  const keys = [];
  for (const ch of text) {
    const k = charToKey(ch);
    if (k) keys.push(k);
  }
  return keys;
}

export function keyToChar(key) {
  if (key === 'space') return ' ';
  if (key === 'enter') return '\n';
  return key;
}
