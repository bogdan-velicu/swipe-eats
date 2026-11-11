import { generateSessionCode } from '../sessionCode';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Small deterministic PRNG (mulberry32) for repeatable tests.
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('generateSessionCode', () => {
  it('defaults to length 6', () => {
    expect(generateSessionCode()).toHaveLength(6);
  });

  it('honours a custom length', () => {
    expect(generateSessionCode(10)).toHaveLength(10);
  });

  it('only uses characters from the charset', () => {
    for (let i = 0; i < 200; i++) {
      for (const ch of generateSessionCode(8)) {
        expect(CHARSET).toContain(ch);
      }
    }
  });

  it('never emits ambiguous characters I, O, 0, 1', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateSessionCode(12)).not.toMatch(/[IO01]/);
    }
  });

  it('is deterministic for a seeded rng', () => {
    expect(generateSessionCode(6, seeded(42))).toBe(generateSessionCode(6, seeded(42)));
    expect(generateSessionCode(6, seeded(42))).not.toBe(generateSessionCode(6, seeded(43)));
  });

  it('maps rng extremes onto the first and last charset characters', () => {
    expect(generateSessionCode(3, () => 0)).toBe('AAA');
    expect(generateSessionCode(3, () => 0.999999)).toBe('999');
  });
});
