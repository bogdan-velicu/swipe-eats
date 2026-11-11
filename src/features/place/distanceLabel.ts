import type { LatLng } from '../../core/types';
import { formatDistance, haversineMeters, walkingMinutes, type UnitSystem } from '../../core/units';

/** "850 m · 10 min walk" in the active unit system; undefined when either point is unknown. */
export function distanceLabel(from: LatLng | undefined, to: LatLng | undefined, unit: UnitSystem): string | undefined {
  if (!from || !to) return undefined;
  const m = haversineMeters(from, to);
  return `${formatDistance(m, unit)} · ${walkingMinutes(m)} min walk`;
}
