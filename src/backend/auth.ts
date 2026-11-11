import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';

/** Signs in anonymously if there is no current user; returns the uid. Idempotent. */
export async function ensureAnonymousAuth(): Promise<string> {
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser.uid;
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}
