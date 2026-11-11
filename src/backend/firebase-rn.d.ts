// firebase/auth's React Native entry exports getReactNativePersistence, but TS resolves
// the web typings. Augment the module so the RN-only export type-checks.
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
