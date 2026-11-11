import { theme } from '../tokens';

describe('design tokens', () => {
  it('uses the dark premium base and amber accent', () => {
    expect(theme.color.bg).toBe('#0c0c10');
    expect(theme.color.accent).toBe('#ff9f43');
  });

  it.each(['color', 'radius', 'space', 'font'] as const)('has a non-empty %s group', (group) => {
    expect(theme[group]).toBeDefined();
    expect(Object.keys(theme[group]).length).toBeGreaterThan(0);
  });

  it('defines every required color', () => {
    for (const k of ['bg', 'surface', 'surfaceGlass', 'text', 'textDim', 'accent', 'like', 'pass']) {
      expect(typeof (theme.color as Record<string, string>)[k]).toBe('string');
    }
  });
});
