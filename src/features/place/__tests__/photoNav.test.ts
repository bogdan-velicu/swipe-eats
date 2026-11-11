import { nextPhotoPage } from '../photoNav';

describe('nextPhotoPage', () => {
  it('advances within bounds', () => {
    expect(nextPhotoPage(0, 5, 1)).toBe(1);
    expect(nextPhotoPage(2, 5, 1)).toBe(3);
  });

  it('goes back within bounds', () => {
    expect(nextPhotoPage(2, 5, -1)).toBe(1);
  });

  it('clamps at the last photo (no wrap)', () => {
    expect(nextPhotoPage(4, 5, 1)).toBe(4);
  });

  it('clamps at the first photo (no wrap)', () => {
    expect(nextPhotoPage(0, 5, -1)).toBe(0);
  });

  it('clamps a stale page that is past the end', () => {
    expect(nextPhotoPage(10, 5, 0)).toBe(4);
  });

  it('is safe for an empty gallery', () => {
    expect(nextPhotoPage(0, 0, 1)).toBe(0);
  });
});
