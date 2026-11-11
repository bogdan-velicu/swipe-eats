import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { defaultUnitSystem, type UnitSystem } from '../core/units';

const STORAGE_KEY = '@swipe-eats/unit';

function deviceLocale(): string {
  try {
    return getLocales()[0]?.languageTag ?? 'en-US';
  } catch {
    return 'en-US';
  }
}

let unit: UnitSystem = defaultUnitSystem(deviceLocale());
let hydrated: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: UnitSystem) {
  if (next === unit) return;
  unit = next;
  listeners.forEach((l) => l());
}

export function getUnit(): UnitSystem {
  return unit;
}

/** Load the persisted unit (once). Storage failures fall back to the locale default. */
export function hydrate(): Promise<void> {
  if (!hydrated) {
    hydrated = (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'metric' || stored === 'imperial') set(stored);
      } catch {
        // keep locale default
      }
    })();
  }
  return hydrated;
}

export async function setUnit(next: UnitSystem): Promise<void> {
  set(next);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, next);
  } catch {
    // in-memory value still applies for this session
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useSettings(): { unit: UnitSystem; setUnit: (u: UnitSystem) => Promise<void> } {
  const current = useSyncExternalStore(subscribe, getUnit, getUnit);
  useEffect(() => {
    void hydrate();
  }, []);
  return { unit: current, setUnit };
}
