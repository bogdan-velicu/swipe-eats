/** Placeholder universal-link host; swap for the real domain when one is registered. */
export const JOIN_LINK_HOST = 'swipeeats.example.com';
export const APP_SCHEME = 'swipeeats';

// Generated codes use a reduced charset (no I/O/0/1) but we accept any 6 alphanumerics so a
// hand-typed or legacy code still reaches the lookup (which gives the real not-found answer).
const CODE_RE = /^[A-Z0-9]{6}$/;

/** Normalizes (trim + uppercase) and validates a join code; null if malformed. */
export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const c = raw.trim().toUpperCase();
  return CODE_RE.test(c) ? c : null;
}

function decode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Extracts a join code from `swipeeats://join?code=ABC123`, the universal link
 * `https://<JOIN_LINK_HOST>/join/ABC123`, or a bare code (what a QR may carry).
 * Returns null for anything else. Pure; no RN imports.
 */
export function parseJoinLink(url: string): string | null {
  if (typeof url !== 'string') return null;
  const s = url.trim();
  if (!s) return null;

  const scheme = s.match(/^swipeeats:\/\/\/?join\/?\?([^#]*)/i);
  if (scheme) {
    const m = scheme[1].match(/(?:^|&)code=([^&]*)/i);
    return m ? normalizeCode(decode(m[1])) : null;
  }

  const host = JOIN_LINK_HOST.replace(/\./g, '\\.');
  const web = s.match(new RegExp('^https://' + host + '/join/([^/?#]+)/?(?:[?#].*)?$', 'i'));
  if (web) return normalizeCode(decode(web[1]));

  return normalizeCode(s);
}

/** Route to open for an inbound link, or null if it is not a join link. */
export function joinPathForLink(url: string): string | null {
  const code = parseJoinLink(url);
  return code ? `/join?code=${code}` : null;
}

/** The shareable deep link for a session code. */
export function buildJoinLink(code: string): string {
  return `${APP_SCHEME}://join?code=${code}`;
}
