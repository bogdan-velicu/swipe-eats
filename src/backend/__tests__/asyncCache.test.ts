import { createAsyncCache } from '../asyncCache';

describe('createAsyncCache', () => {
  it('loads once per key and reuses the result', async () => {
    let calls = 0;
    const cache = createAsyncCache<string>(async (k) => {
      calls++;
      return `v:${k}`;
    });
    const [a, b] = await Promise.all([cache('x'), cache('x')]);
    expect(a).toBe('v:x');
    expect(b).toBe('v:x');
    expect(await cache('x')).toBe('v:x');
    expect(calls).toBe(1);
    expect(cache.has('x')).toBe(true);
  });

  it('caches distinct keys separately', async () => {
    const seen: string[] = [];
    const cache = createAsyncCache<number>(async (k) => {
      seen.push(k);
      return k.length;
    });
    expect(await cache('a')).toBe(1);
    expect(await cache('bb')).toBe(2);
    expect(seen).toEqual(['a', 'bb']);
  });

  it('evicts a rejected call so the next call retries', async () => {
    let calls = 0;
    const cache = createAsyncCache<string>(async () => {
      calls++;
      if (calls === 1) throw new Error('boom');
      return 'ok';
    });
    await expect(cache('k')).rejects.toThrow('boom');
    expect(cache.has('k')).toBe(false);
    expect(await cache('k')).toBe('ok');
    expect(calls).toBe(2);
  });

  it('keeps an empty-but-successful result (no refetch)', async () => {
    let calls = 0;
    const cache = createAsyncCache<string[]>(async () => {
      calls++;
      return [];
    });
    expect(await cache('k')).toEqual([]);
    expect(await cache('k')).toEqual([]);
    expect(calls).toBe(1);
  });
});
