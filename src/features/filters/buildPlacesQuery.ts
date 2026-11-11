// Pure: Filters -> the input the searchPlaces proxy accepts. No React / network imports.
import { FOOD_TYPES } from '../../core/foodTypes';
import type { Filters, LatLng } from '../../core/types';
import { walkingMeters } from '../../core/units';

/** Shape accepted by the `searchPlaces` callable (see functions/src/places.ts SearchInput). */
export interface SearchPlacesInput {
  anchor: LatLng;
  /** locationBias circle radius - a soft bias in Places (New), not a hard cap. */
  radiusMeters: number;
  /** Places types; the proxy uses one as primary and folds the rest into the text query. */
  includedTypes: string[];
  maxPrice?: string;
  minRating?: number;
  openNow: boolean;
}

export const DEFAULT_RADIUS_M = 1500;
export const MIN_RADIUS_M = 100;
export const MAX_RADIUS_M = 50000; // Places API locationBias.circle.radius ceiling

function radiusFor(f: Filters): number {
  const raw = f.radiusMeters ?? (f.maxWalkMin ? walkingMeters(f.maxWalkMin) : DEFAULT_RADIUS_M);
  return Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, raw));
}

export function cuisineTypes(cuisines: string[]): string[] {
  const out: string[] = [];
  for (const c of cuisines) {
    const t = FOOD_TYPES.find((x) => x.value === c)?.placesType;
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

/** Never throws; overly tight filters just produce an (eventually empty) valid query. */
export function buildPlacesQuery(f: Filters): SearchPlacesInput {
  const q: SearchPlacesInput = {
    anchor: f.anchor,
    radiusMeters: radiusFor(f),
    includedTypes: cuisineTypes(f.cuisines ?? []),
    openNow: !!f.openNow,
  };
  if (f.maxPrice) q.maxPrice = f.maxPrice;
  if (f.minRating) q.minRating = f.minRating;
  return q;
}
