import type { Filters } from '../../core/types';
import { walkingMeters } from '../../core/units';

export const DEFAULT_RANGE_METERS = 1500;

/** Search radius in meters: explicit radius, else walking-time derived, else a default. Pure. */
export function rangeMeters(filters: Partial<Filters>): number {
  if (filters.radiusMeters && filters.radiusMeters > 0) return filters.radiusMeters;
  if (filters.maxWalkMin && filters.maxWalkMin > 0) return walkingMeters(filters.maxWalkMin);
  return DEFAULT_RANGE_METERS;
}

const METERS_PER_DEG_LAT = 111320;

/** Map region that comfortably frames a circle of `radius` meters around `center`. Pure. */
export function fitRegion(center: { lat: number; lng: number }, radius: number) {
  const latitudeDelta = (radius * 2 * 1.4) / METERS_PER_DEG_LAT;
  const cos = Math.max(0.01, Math.cos((center.lat * Math.PI) / 180));
  return { latitude: center.lat, longitude: center.lng, latitudeDelta, longitudeDelta: latitudeDelta / cos };
}
