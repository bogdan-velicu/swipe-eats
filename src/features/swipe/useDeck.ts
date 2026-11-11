import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { recordSwipe } from '../../backend/sessionService';
import type { Candidate, Session, SwipeDir } from '../../core/types';

export interface Deck {
  current: Candidate | null;
  next: Candidate | null;
  like: () => void;
  pass: () => void;
  maybe: () => void;
  remaining: number;
  empty: boolean;
}

/**
 * Deck logic (no rendering): walks session.candidates in order, recording each
 * swipe. The index lives in a ref too so rapid double-fires (fling + button tap)
 * can never record the same card twice.
 */
export function useDeck(session: Pick<Session, 'id' | 'candidates'>, alreadySwiped: readonly string[] = []): Deck {
  // Rehydration: ids swiped before this deck mounted are skipped. Captured once per
  // session id so live swipe snapshots from our own writes never shift the index.
  const skipRef = useRef<{ sid: string; ids: Set<string> }>({ sid: session.id, ids: new Set(alreadySwiped) });
  if (skipRef.current.sid !== session.id) skipRef.current = { sid: session.id, ids: new Set(alreadySwiped) };
  const skip = skipRef.current.ids;
  const all = session.candidates ?? [];
  const candidates = useMemo(() => all.filter((c) => !skip.has(c.id)), [all, skip]);
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
  const maybe = useCallback(() => swipe('MAYBE'), [swipe]);

  const remaining = Math.max(0, candidates.length - index);
  return {
    current: candidates[index] ?? null,
    next: candidates[index + 1] ?? null,
    like,
    pass,
    maybe,
    remaining,
    empty: remaining === 0,
  };
}
