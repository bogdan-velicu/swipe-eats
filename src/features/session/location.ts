import * as Location from 'expo-location';
import type { LatLng } from '../../core/types';

export type LocationResult = { ok: true; anchor: LatLng } | { ok: false; error: string };

/** Current GPS position (asks foreground permission). Never throws. */
export async function currentLocation(): Promise<LocationResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return { ok: false, error: 'Location permission denied. Type an address instead.' };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { ok: true, anchor: { lat: pos.coords.latitude, lng: pos.coords.longitude } };
  } catch {
    return { ok: false, error: "Couldn't get your location. Type an address instead." };
  }
}

/** Geocodes a typed address. Never throws. */
export async function geocodeAddress(address: string): Promise<LocationResult> {
  const q = address.trim();
  if (!q) return { ok: false, error: 'Enter an address.' };
  try {
    const hits = await Location.geocodeAsync(q);
    if (!hits.length) return { ok: false, error: "Couldn't find that address." };
    return { ok: true, anchor: { lat: hits[0].latitude, lng: hits[0].longitude } };
  } catch {
    return { ok: false, error: "Couldn't look up that address. Check your connection." };
  }
}
