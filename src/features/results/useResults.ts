import { useMemo } from 'react';
import { activeParticipantIds, leaderboard as rawLeaderboard, matches as rawMatches } from '../../core/matching';
import type { Candidate, Session } from '../../core/types';

export interface LeaderboardEntry {
  candidate: Candidate;
  likes: number;
}

export interface Results {
  /** Candidates every active participant liked. */
  matches: Candidate[];
  /** Candidates by like count, most-liked first. */
  leaderboard: LeaderboardEntry[];
  /** Solo mode only (<=1 active participant): every candidate the user liked. Empty for groups. */
  soloPicks: Candidate[];
}

/** Pure derivation (testable without rendering). */
export function computeResults(session: Session): Results {
  const byId = new Map((session.candidates ?? []).map((c) => [c.id, c]));
  const active = activeParticipantIds(session);

  const matches = rawMatches(session).flatMap((id) => byId.get(id) ?? []);
  const leaderboard = rawLeaderboard(session).flatMap(({ candidateId, likes }) => {
    const candidate = byId.get(candidateId);
    return candidate ? [{ candidate, likes }] : [];
  });

  let soloPicks: Candidate[] = [];
  if (active.length === 1) {
    const mine = session.swipes?.[active[0]] ?? {};
    soloPicks = (session.candidates ?? []).filter((c) => mine[c.id] === 'LIKE');
  }
  return { matches, leaderboard, soloPicks };
}

export function useResults(session: Session): Results {
  return useMemo(() => computeResults(session), [session]);
}
