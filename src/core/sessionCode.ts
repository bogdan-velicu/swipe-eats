/**
 * Session code generator (pure, no React/RN imports).
 *
 * Codes are short and human-friendly: the charset omits visually ambiguous
 * characters (I, O, 0, 1).
 */
export const SESSION_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a session join code.
 *
 * @param len Code length (default 6).
 * @param rng Source of floats in [0, 1). Injectable for test determinism.
 *            Production callers SHOULD pass a crypto-backed source (e.g. one
 *            built on `expo-crypto` random bytes) rather than relying on the
 *            default `Math.random`, which is not cryptographically secure.
 */
export function generateSessionCode(
  len: number = 6,
  rng: () => number = Math.random,
): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    const idx = Math.min(
      SESSION_CODE_CHARSET.length - 1,
      Math.floor(rng() * SESSION_CODE_CHARSET.length),
    );
    out += SESSION_CODE_CHARSET[idx];
  }
  return out;
}
