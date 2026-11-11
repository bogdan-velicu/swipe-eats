import { joinPathForLink } from '../src/features/join/useDeepLink';

/**
 * Rewrites inbound deep links before expo-router resolves them: the placeholder universal link
 * https://<host>/join/<CODE> (and swipeeats://join?code=...) both land on /join?code=<CODE>.
 * Anything else passes through unchanged.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return joinPathForLink(path) ?? path;
}
