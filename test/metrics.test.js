import { describe, it, expect } from 'vitest';
import { alignKeys } from '../src/sim/metrics.js';

describe('alignment of typed against target keys', () => {
  it('detects a transposition as one error', () => {
    const ops = alignKeys([...'the'], [...'teh']);
    expect(ops.filter((o) => o.op === 'transposition')).toHaveLength(1);
    expect(ops.filter((o) => o.op === 'substitution')).toHaveLength(0);
  });

  it('detects omissions and insertions', () => {
    expect(alignKeys([...'quick'], [...'qick']).filter((o) => o.op === 'omission')).toHaveLength(1);
    expect(alignKeys([...'fox'], [...'foox']).filter((o) => o.op === 'insertion')).toHaveLength(1);
  });

  it('detects substitutions', () => {
    const ops = alignKeys([...'dog'], [...'fog']);
    expect(ops[0]).toMatchObject({ op: 'substitution', target: 'd', typed: 'f' });
  });
});
