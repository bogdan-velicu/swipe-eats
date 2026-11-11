import { useCallback, useEffect, useState } from 'react';
import { observeSession } from '../../backend/sessionService';
import type { Session } from '../../core/types';

export interface UseSession {
  session: Session | null;
  loading: boolean;
  error: Error | null;
  /** Re-subscribe after an error. */
  retry: () => void;
}

/** Realtime session (caller must already be a participant). `null` session + !loading = doesn't exist. */
export function useSession(id: string | undefined): UseSession {
  type Data = Omit<UseSession, 'retry'>;
  const [state, setState] = useState<Data>({ session: null, loading: !!id, error: null });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!id) {
      setState({ session: null, loading: false, error: null });
      return;
    }
    setState({ session: null, loading: true, error: null });
    const unsub = observeSession(
      id,
      (session) => setState({ session, loading: false, error: null }),
      // Drop the last snapshot: after an error it is stale, so callers show a connection-lost state.
      (error) => setState({ session: null, loading: false, error }),
    );
    return () => unsub();
  }, [id, attempt]);

  return { ...state, retry };
}
