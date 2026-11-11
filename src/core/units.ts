// Pure unit/distance helpers. No React / React Native imports.

import type { LatLng } from './types';

export type UnitSystem = 'metric' | 'imperial';

const EARTH_RADIUS_M = 6371000;
const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;
const WALK_METERS_PER_MIN = 5000 / 60; // 5 km/h ≈ 83.3 m/min
const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM']);

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in meters between two coordinates. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Human-readable distance. Metric: "850 m" (rounded to 10 m) below 1 km, else
 * "1.5 km". Imperial: feet (rounded to 10 ft) below 0.1 mi, else "1.0 mi".
 */
export function formatDistance(meters: number, u: UnitSystem): string {
  const m = Math.max(0, meters);
  if (u === 'imperial') {
    const miles = m / METERS_PER_MILE;
    if (miles < 0.1) {
      return `${Math.round((m * FEET_PER_METER) / 10) * 10} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  }
  if (m < 1000) {
    return `${Math.round(m / 10) * 10} m`;
  }
  return `${(m / 1000).toFixed(1)} km`;
}

/** Walking time in whole minutes at 5 km/h. */
export function walkingMinutes(meters: number): number {
  return Math.round(Math.max(0, meters) / WALK_METERS_PER_MIN);
}

/** Imperial for US, Liberia, Myanmar locales; metric everywhere else. */
export function defaultUnitSystem(locale: string): UnitSystem {
  const region = locale.split(/[-_]/)[1]?.toUpperCase();
  return region && IMPERIAL_REGIONS.has(region) ? 'imperial' : 'metric';
}
