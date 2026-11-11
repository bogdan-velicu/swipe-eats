import type { SwipeDir } from '../../core/types';
import { shouldFling } from './shouldFling';

/**
 * Resolve a released drag into a swipe direction. Worklet-safe (runs on the UI thread).
 * Downward-dominant gestures are MAYBE; otherwise fall back to the horizontal like/pass rule.
 * A gesture that is mostly horizontal (or moving up, or below every threshold) is never MAYBE.
 */
export function resolveSwipe(
  tx: number,
  ty: number,
  vx: number,
  vy: number,
  threshold: number,
): SwipeDir | null {
  'worklet';
  const downwardDominant = ty > Math.abs(tx) * 1.2 && vy > -300;
  if (downwardDominant && (ty > threshold || vy > 900)) return 'MAYBE';
  return shouldFling(tx, vx, threshold);
}
