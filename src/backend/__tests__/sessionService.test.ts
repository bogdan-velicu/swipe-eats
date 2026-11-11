/**
 * Runs ONLY against the Auth + Firestore emulators (npm run test:emu). The emulator loads
 * firestore.rules, so these tests also prove the service's writes satisfy the security rules.
 */
import { connectAuthEmulator, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ensureAnonymousAuth } from '../auth';
import {
  cancelSession,
  createSession,
  endSession,
  findSessionByCode,
  joinSession,
  leaveSession,
  observeSession,
  recordSwipe,
  setCandidates,
  startPlacesRound,
} from '../sessionService';
import type { Candidate, Filters, Participant, Session } from '../../core/types';

const filters: Filters = {
  unit: 'metric',
  cuisines: [],
  openNow: true,
  anchor: { lat: 40.7, lng: -74.0 },
};

const hostInfo = { name: 'Host', emoji: 'H', color: '#ff0000' };

function guest(name: string): Omit<Participant, 'id'> {
  return { name, emoji: 'G', color: '#00ff00', joinedAt: Date.now(), active: true };
}

async function signInNewUser(): Promise<string> {
  await signOut(auth);
  return ensureAnonymousAuth();
}

function waitFor(cond: () => boolean, ms = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (cond()) return resolve();
      if (Date.now() - start > ms) return reject(new Error('waitFor timed out'));
      setTimeout(tick, 25);
    };
    tick();
  });
}

beforeAll(() => {
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const fsHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (!authHost || !fsHost) throw new Error('emulator env not set; run via npm run test:emu');
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const [h, p] = fsHost.split(':');
  connectFirestoreEmulator(db, h, Number(p));
});

describe('sessionService', () => {
  it('createSession -> findSessionByCode round-trips (host is a participant)', async () => {
    const hostUid = await signInNewUser();
    const created = await createSession({ host: hostInfo, mode: 'foodType', filters });
    expect(created.hostId).toBe(hostUid);
    expect(created.status).toBe('waiting');
    expect(created.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(created.participants[hostUid]).toMatchObject({ id: hostUid, name: 'Host', active: true });

    const found = await findSessionByCode(created.code.toLowerCase());
    expect(found?.id).toBe(created.id);
    expect(found?.hostId).toBe(hostUid);
    expect(await findSessionByCode('ZZZZZZ')).toBeNull();
  });

  it('a non-participant can find by code (stub) and then join', async () => {
    await signInNewUser();
    const s = await createSession({ host: hostInfo, mode: 'foodType', filters });
    const guestUid = await signInNewUser();
    const found = await findSessionByCode(s.code);
    expect(found?.id).toBe(s.id);
    await joinSession(s.id, { ...guest('Guest'), id: 'ignored' });
    // after joining, the guest may read the session
    const snap = await getDoc(doc(db, 'sessions', s.id));
    expect(snap.exists()).toBe(true);
    const p = await getDoc(doc(db, 'sessions', s.id, 'participants', guestUid));
    expect(p.data()).toMatchObject({ id: guestUid, name: 'Guest', active: true });
  });

  it('re-joining after leaving reactivates the participant', async () => {
    await signInNewUser();
    const s = await createSession({ host: hostInfo, mode: 'foodType', filters });
    const guestUid = await signInNewUser();
    await joinSession(s.id, { ...guest('Guest'), id: 'x' });
    await leaveSession(s.id);
    await joinSession(s.id, { ...guest('Guest'), id: 'x' });
    const p = await getDoc(doc(db, 'sessions', s.id, 'participants', guestUid));
    expect(p.data()?.active).toBe(true);
  });

  it('recordSwipe writes the caller swipes doc; leave flips active; observe composes the logical Session', async () => {
    const hostUid = await signInNewUser();
    const s = await createSession({ host: hostInfo, mode: 'foodType', filters });
    const seen: (Session | null)[] = [];
    const unsub = observeSession(s.id, (x) => seen.push(x));
    await waitFor(() => seen.length > 0);
    expect(seen[seen.length - 1]?.participants[hostUid].active).toBe(true);

    await recordSwipe(s.id, 'pizza', 'LIKE');
    await recordSwipe(s.id, 'sushi', 'PASS');
    await waitFor(() => seen[seen.length - 1]?.swipes[hostUid]?.sushi === 'PASS');
    expect(seen[seen.length - 1]?.swipes[hostUid]).toEqual({ pizza: 'LIKE', sushi: 'PASS' });

    const raw = await getDoc(doc(db, 'sessions', s.id, 'swipes', hostUid));
    expect(raw.data()).toEqual({ pizza: 'LIKE', sushi: 'PASS' });

    await leaveSession(s.id);
    await waitFor(() => seen[seen.length - 1]?.participants[hostUid]?.active === false);
    unsub();
  });

  it('setCandidates / startPlacesRound update the session doc', async () => {
    await signInNewUser();
    const s = await createSession({ host: hostInfo, mode: 'both', filters });
    const cands: Candidate[] = [
      { id: 'p1', kind: 'place', placeId: 'abc', name: 'Place One', rating: 4.5 },
      { id: 'p2', kind: 'place', name: 'Place Two' },
    ];
    await setCandidates(s.id, cands);
    await startPlacesRound(s.id);
    const snap = (await getDoc(doc(db, 'sessions', s.id))).data()!;
    expect(snap.candidates).toEqual(cands);
    expect(snap.mode).toBe('place');
    expect(snap.status).toBe('active');
  });

  it('host can end; host can cancel; writes then fail', async () => {
    await signInNewUser();
    const a = await createSession({ host: hostInfo, mode: 'foodType', filters });
    await endSession(a.id);
    expect((await getDoc(doc(db, 'sessions', a.id))).data()?.status).toBe('finished');
    await expect(recordSwipe(a.id, 'x', 'LIKE')).rejects.toThrow();
    const b = await createSession({ host: hostInfo, mode: 'foodType', filters });
    await cancelSession(b.id);
    expect((await getDoc(doc(db, 'sessions', b.id))).data()?.status).toBe('cancelled');
  });

  it('a non-host cannot end or cancel via the service', async () => {
    await signInNewUser();
    const s = await createSession({ host: hostInfo, mode: 'foodType', filters });
    await signInNewUser();
    await joinSession(s.id, { ...guest('G'), id: 'x' });
    await expect(endSession(s.id)).rejects.toThrow();
    await expect(cancelSession(s.id)).rejects.toThrow();
  });
});
