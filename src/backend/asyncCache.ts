/**
 * Memoizes an async loader by string key, in memory for the app session only
 * (never persisted). Concurrent calls for the same key share one in-flight promise;
 * a resolved value — including an empty one — is kept so it is never re-fetched; a
 * rejected call is evicted so the next call retries.
 *
 * Used to stop the results screen re-fetching Places photos it already pulled while
 * swiping. Holding Google photo URLs in memory for the session is ToS-compliant
 * (the ban is on persisting them to disk / Firestore, not on a render-time cache).
 */
export interface AsyncCache<T> {
  (key: string): Promise<T>;
  has(key: string): boolean;
  clear(): void;
}

export function createAsyncCache<T>(loader: (key: string) => Promise<T>): AsyncCache<T> {
  const cache = new Map<string, Promise<T>>();
  const get = ((key: string): Promise<T> => {
    const hit = cache.get(key);
    if (hit) return hit;
    const pending = loader(key).catch((err) => {
      cache.delete(key);
      throw err;
    });
    cache.set(key, pending);
    return pending;
  }) as AsyncCache<T>;
  get.has = (key: string) => cache.has(key);
  get.clear = () => cache.clear();
  return get;
}
