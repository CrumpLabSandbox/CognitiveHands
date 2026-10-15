import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { Keyboard } from '../src/instrument/keyboard.js';
import { textToKeys, PITCH } from '../src/instrument/layout.js';
import { fingerFor, transitionClass } from '../src/motor/fingering.js';

describe('keyboard geometry', () => {
  const kb = new Keyboard();

  it('has the home row at z = 0 with g|h straddling the centre', () => {
    expect(kb.keyCenter('g').x).toBeCloseTo(-PITCH / 2, 9);
    expect(kb.keyCenter('h').x).toBeCloseTo(PITCH / 2, 9);
    expect(kb.keyCenter('f').z).toBe(0);
    expect(kb.keyCenter('r').z).toBeCloseTo(-PITCH, 9);
    expect(kb.keyCenter('v').z).toBeCloseTo(PITCH, 9);
  });

  it('finds the key under a point', () => {
    const j = kb.keyCenter('j');
    expect(kb.keyAt(j.x + 0.004, j.z - 0.003).id).toBe('j');
    expect(kb.keyAt(j.x + PITCH, j.z).id).toBe('k');
    expect(kb.keyAt(0, 2 * PITCH).id).toBe('space');
  });

  it('registers a press when a fingertip crosses the actuation depth', () => {
    const f = kb.keyCenter('f');
    const tip = { hand: 'left', finger: 'index', pos: new Vector3(f.x, 0.005, f.z) };
    expect(kb.update([tip], 0)).toEqual([]);
    tip.pos.y = -0.001;
    expect(kb.update([tip], 0.01)).toEqual([]);
    tip.pos.y = -0.0025;
    const down = kb.update([tip], 0.02);
    expect(down).toHaveLength(1);
    expect(down[0]).toMatchObject({ type: 'down', key: 'f', hand: 'left', finger: 'index' });
    tip.pos.y = -0.0035;
    expect(kb.update([tip], 0.03)).toEqual([]);
    tip.pos.y = 0.002;
    const up = kb.update([tip], 0.04);
    expect(up[0]).toMatchObject({ type: 'up', key: 'f' });
  });
});

describe('text and fingering', () => {
  it('maps text to keys, folding case and shifted symbols', () => {
    expect(textToKeys('Hi, you!')).toEqual(['h', 'i', ',', 'space', 'y', 'o', 'u', '1']);
  });

  it('assigns standard touch-typing fingers', () => {
    expect(fingerFor('f')).toEqual({ hand: 'left', finger: 'index' });
    expect(fingerFor('p')).toEqual({ hand: 'right', finger: 'little' });
    expect(fingerFor('space')).toEqual({ hand: 'right', finger: 'thumb' });
  });

  it('classifies transitions', () => {
    expect(transitionClass('f', 'j')).toBe('alternate hand');
    expect(transitionClass('f', 'd')).toBe('same hand, different finger');
    expect(transitionClass('f', 'r')).toBe('same finger, different key');
    expect(transitionClass('l', 'l')).toBe('same key');
  });
});
