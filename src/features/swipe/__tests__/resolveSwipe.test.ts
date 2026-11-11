import { resolveSwipe } from '../resolveSwipe';

const TH = 100;

describe('resolveSwipe', () => {
  it('right drag past threshold → LIKE', () => {
    expect(resolveSwipe(150, 10, 0, 0, TH)).toBe('LIKE');
  });

  it('left drag past threshold → PASS', () => {
    expect(resolveSwipe(-150, 10, 0, 0, TH)).toBe('PASS');
  });

  it('downward drag past threshold → MAYBE', () => {
    expect(resolveSwipe(10, 150, 0, 100, TH)).toBe('MAYBE');
  });

  it('fast downward flick → MAYBE', () => {
    expect(resolveSwipe(5, 40, 0, 1500, TH)).toBe('MAYBE');
  });

  it('mostly-horizontal drag with some down still → LIKE (not maybe)', () => {
    expect(resolveSwipe(160, 110, 0, 0, TH)).toBe('LIKE');
  });

  it('below all thresholds → null', () => {
    expect(resolveSwipe(20, 20, 0, 0, TH)).toBeNull();
  });

  it('upward drag → null (no action)', () => {
    expect(resolveSwipe(10, -150, 0, -800, TH)).toBeNull();
  });
});
