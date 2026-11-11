import { shouldFling } from '../shouldFling';

const T = 120;
describe('shouldFling', () => {
  it('forward drag past threshold flings with neutral velocity', () => {
    expect(shouldFling(150, 0, T)).toBe('LIKE');
    expect(shouldFling(-150, 50, T)).toBe('PASS');
  });
  it('fast forward flick past deadzone flings', () => {
    expect(shouldFling(40, 1500, T)).toBe('LIKE');
    expect(shouldFling(-40, -1500, T)).toBe('PASS');
  });
  it('backward flick after a small drag does NOT fling', () => {
    expect(shouldFling(40, -1500, T)).toBeNull();
    expect(shouldFling(-40, 1500, T)).toBeNull();
  });
  it('tiny drag with fast velocity (inside deadzone) does not fling', () => {
    expect(shouldFling(4, 2000, T)).toBeNull();
    expect(shouldFling(0, 2000, T)).toBeNull();
  });
  it('past threshold but hard flicked back cancels', () => {
    expect(shouldFling(150, -2000, T)).toBeNull();
  });
  it('small slow drag snaps back', () => {
    expect(shouldFling(30, 100, T)).toBeNull();
  });
});
