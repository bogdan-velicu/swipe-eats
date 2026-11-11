import { useEffect, useState } from 'react';
import { observeSession } from '../../backend/sessionService';
import type { Session } from '../../core/types';

export interface UseSession {
  session: Session | null;
  loading: boolean;
  error: Error | null;
}

/** Realtime session (caller must already be a participant). `null` session + !loading = doesn't exist. */
export function useSession(id: string | undefined): UseSession {
  const [state, setState] = useState<UseSession>({ session: null, loading: !!id, error: null });

  useEffect(() => {
    if (!id) {
      setState({ session: null, loading: false, error: null });
      return;
    }
    setState({ session: null, loading: true, error: null });
    const unsub = observeSession(
      id,
      (session) => setState({ session, loading: false, error: null }),
      (error) => setState((s) => ({ ...s, loading: false, error })),
    );
    return () => unsub();
  }, [id]);

  return state;
}
