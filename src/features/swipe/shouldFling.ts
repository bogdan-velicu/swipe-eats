import type { SwipeDir } from '../../core/types';

export const VELOCITY_TRIGGER = 900;
/** Minimum drag before a velocity flick counts; stops a tiny/backward drag from registering. */
export const FLING_DEADZONE = 12;

/**
 * Decides whether a pan release commits a swipe. Position and velocity must AGREE for a
 * velocity-driven fling, so a small drag one way plus a fast flick back never swipes.
 * Worklet-safe (pure, no closures over non-worklet values).
 */
export function shouldFling(translationX: number, velocityX: number, threshold: number): SwipeDir | null {
  'worklet';
  const dir: SwipeDir | null = translationX > 0 ? 'LIKE' : translationX < 0 ? 'PASS' : null;
  if (dir === null) return null;
  const opposing = dir === 'LIKE' ? velocityX < -VELOCITY_TRIGGER : velocityX > VELOCITY_TRIGGER;
  if (Math.abs(translationX) > threshold) return opposing ? null : dir;
  const agreeing = dir === 'LIKE' ? velocityX > VELOCITY_TRIGGER : velocityX < -VELOCITY_TRIGGER;
  return agreeing && Math.abs(translationX) > FLING_DEADZONE ? dir : null;
}
