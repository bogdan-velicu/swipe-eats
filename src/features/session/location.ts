import * as Location from 'expo-location';
import type { LatLng } from '../../core/types';
import { geocode } from '../../backend/placesClient';

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
    // Server-side geocode (via the Places proxy) so this works without a device geocoder/GPS.
    const r = await geocode(q);
    if (!r) return { ok: false, error: "Couldn't find that address." };
    return { ok: true, anchor: { lat: r.lat, lng: r.lng } };
  } catch {
    return { ok: false, error: "Couldn't look up that address. Check your connection." };
  }
}
