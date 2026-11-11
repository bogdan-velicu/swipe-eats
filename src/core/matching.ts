// Pure matching engine: no React / React Native imports.
import type { Session, SwipeDir } from './types';

/** Ids of participants who are still in the session (active !== false). */
export function activeParticipantIds(s: Session): string[] {
  return Object.keys(s.participants ?? {}).filter((id) => s.participants[id].active !== false);
}

/** LIKE counts per candidate across active participants, sorted desc by likes. */
export function leaderboard(s: Session): { candidateId: string; likes: number }[] {
  const counts = new Map<string, number>();
  for (const id of activeParticipantIds(s)) {
    const mine = s.swipes?.[id] ?? {};
    for (const [candidateId, dir] of Object.entries(mine)) {
      if (dir === 'LIKE') counts.set(candidateId, (counts.get(candidateId) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([candidateId, likes]) => ({ candidateId, likes }))
    .sort((a, b) => b.likes - a.likes);
}

/** Candidate ids that every active participant liked. */
export function matches(s: Session): string[] {
  const active = activeParticipantIds(s);
  if (active.length === 0) return [];
  const candidateIds = new Set<string>();
  for (const id of active) for (const c of Object.keys(s.swipes?.[id] ?? {})) candidateIds.add(c);
  return [...candidateIds].filter((c) => active.every((id) => s.swipes?.[id]?.[c] === 'LIKE'));
}

/** Pure: returns a new Session with the swipe set (overwrites, never double-counts). */
export function applySwipe(
  s: Session,
  userId: string,
  candidateId: string,
  dir: SwipeDir,
): Session {
  return {
    ...s,
    swipes: {
      ...s.swipes,
      [userId]: { ...(s.swipes?.[userId] ?? {}), [candidateId]: dir },
    },
  };
}
