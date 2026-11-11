import { findSessionByCode } from '../../backend/sessionService';
import { normalizeCode } from './useDeepLink';

export type ResolveResult =
  | { ok: true; sessionId: string; code: string }
  | { ok: false; error: string };

export function joinErrorMessage(e: unknown): string {
  const code = (e as { code?: string } | null)?.code;
  if (code === 'permission-denied') return 'You are not allowed to join this session.';
  return 'Connection problem. Check your internet and try again.';
}

/**
 * Resolves a typed/scanned/deep-linked code. `findSessionByCode` returns only a lobby STUB for
 * non-participants, so we expose just the id + code (never the stub's host/filters/anchor).
 * Never throws: every failure becomes a readable message.
 */
export async function resolveJoinCode(raw: string): Promise<ResolveResult> {
  const code = normalizeCode(raw);
  if (!code) return { ok: false, error: 'That does not look like a valid 6-character code.' };
  try {
    const s = await findSessionByCode(code);
    if (!s) return { ok: false, error: "Couldn't find that session. Check the code and try again." };
    if (s.status === 'finished') return { ok: false, error: 'That session has already ended.' };
    if (s.status === 'cancelled') return { ok: false, error: 'That session was cancelled.' };
    return { ok: true, sessionId: s.id, code };
  } catch (e) {
    return { ok: false, error: joinErrorMessage(e) };
  }
}
