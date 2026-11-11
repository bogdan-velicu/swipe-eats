/**
 * Runs ONLY against the Firebase Auth emulator (npm run test:emu).
 * Excluded from the plain `npm test` unit suite.
 */
import { connectAuthEmulator } from 'firebase/auth';
import { auth } from '../firebase';
import { ensureAnonymousAuth } from '../auth';

beforeAll(() => {
  const hostPort = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!hostPort) throw new Error('FIREBASE_AUTH_EMULATOR_HOST not set; run via npm run test:emu');
  connectAuthEmulator(auth, `http://${hostPort}`, { disableWarnings: true });
});

describe('ensureAnonymousAuth', () => {
  it('returns a uid and a second call returns the same uid', async () => {
    const first = await ensureAnonymousAuth();
    expect(typeof first).toBe('string');
    expect(first.length).toBeGreaterThan(0);
    expect(auth.currentUser?.isAnonymous).toBe(true);
    const second = await ensureAnonymousAuth();
    expect(second).toBe(first);
  });
});
