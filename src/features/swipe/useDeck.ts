import { useCallback, useEffect, useRef, useState } from 'react';
import { recordSwipe } from '../../backend/sessionService';
import type { Candidate, Session, SwipeDir } from '../../core/types';

export interface Deck {
  current: Candidate | null;
  next: Candidate | null;
  like: () => void;
  pass: () => void;
  remaining: number;
  empty: boolean;
}

/**
 * Deck logic (no rendering): walks session.candidates in order, recording each
 * swipe. The index lives in a ref too so rapid double-fires (fling + button tap)
 * can never record the same card twice.
 */
export function useDeck(session: Pick<Session, 'id' | 'candidates'>): Deck {
  const candidates = session.candidates ?? [];
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const candRef = useRef(candidates);
  candRef.current = candidates;
  const sessionId = session.id;

  useEffect(() => {
    indexRef.current = 0;
    setIndex(0);
  }, [sessionId]);

  const swipe = useCallback(
    (dir: SwipeDir) => {
      const card = candRef.current[indexRef.current];
      if (!card) return;
      indexRef.current += 1;
      setIndex(indexRef.current);
      // Fire-and-forget: a failed write must not stall the deck.
      void Promise.resolve(recordSwipe(sessionId, card.id, dir)).catch(() => {});
    },
    [sessionId],
  );

  const like = useCallback(() => swipe('LIKE'), [swipe]);
  const pass = useCallback(() => swipe('PASS'), [swipe]);

  const remaining = Math.max(0, candidates.length - index);
  return {
    current: candidates[index] ?? null,
    next: candidates[index + 1] ?? null,
    like,
    pass,
    remaining,
    empty: remaining === 0,
  };
}
