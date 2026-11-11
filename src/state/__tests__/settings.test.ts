const KEY = '@swipe-eats/unit';

function load(locale: string, store: Record<string, string>, opts: { failStorage?: boolean } = {}) {
  jest.resetModules();
  jest.doMock('expo-localization', () => ({
    getLocales: () => [{ languageTag: locale }],
  }));
  jest.doMock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => {
        if (opts.failStorage) throw new Error('boom');
        return store[k] ?? null;
      }),
      setItem: jest.fn(async (k: string, v: string) => {
        if (opts.failStorage) throw new Error('boom');
        store[k] = v;
      }),
    },
  }));
  return require('../settings') as typeof import('../settings');
}

describe('settings store', () => {
  it('initial unit is the locale default', async () => {
    expect(load('en-US', {}).getUnit()).toBe('imperial');
    expect(load('de-DE', {}).getUnit()).toBe('metric');
  });

  it('persists setUnit across a simulated reload', async () => {
    const store: Record<string, string> = {};
    const first = load('de-DE', store);
    await first.hydrate();
    expect(first.getUnit()).toBe('metric');
    await first.setUnit('imperial');
    expect(first.getUnit()).toBe('imperial');
    expect(store[KEY]).toBe('imperial');

    const second = load('de-DE', store);
    expect(second.getUnit()).toBe('metric'); // before hydration
    await second.hydrate();
    expect(second.getUnit()).toBe('imperial');
  });

  it('falls back to the locale default when storage fails', async () => {
    const s = load('en-US', {}, { failStorage: true });
    await expect(s.hydrate()).resolves.toBeUndefined();
    expect(s.getUnit()).toBe('imperial');
    await expect(s.setUnit('metric')).resolves.toBeUndefined();
    expect(s.getUnit()).toBe('metric');
  });

  it('ignores invalid stored values', async () => {
    const s = load('de-DE', { [KEY]: 'furlongs' });
    await s.hydrate();
    expect(s.getUnit()).toBe('metric');
  });
});
