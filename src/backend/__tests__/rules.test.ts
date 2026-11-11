/**
 * Firestore security-rules tests. Runs ONLY under the emulator (npm run test:emu).
 * Uses @firebase/rules-unit-testing contexts so several distinct users can act at once.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { join } from 'path';

let env: RulesTestEnvironment;
const SID = 'sess1';
const part = (id: string) => ({ id, name: id, emoji: 'E', color: '#fff', joinedAt: 1, active: true });
const baseFilters = { unit: 'metric', cuisines: [], openNow: true, anchor: { lat: 1, lng: 2 } };
const sessionDoc = (status = 'waiting') => ({
  code: 'ABC234',
  hostId: 'host',
  status,
  mode: 'foodType',
  filters: baseFilters,
  candidates: [],
});
const codeDoc = (sessionId: string, _hostId?: string) => ({ sessionId });

async function seed(status = 'waiting') {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc(`sessions/${SID}`).set(sessionDoc(status));
    await db.doc(`sessions/${SID}/participants/host`).set(part('host'));
    await db.doc(`sessions/${SID}/participants/alice`).set(part('alice'));
    await db.doc(`sessions/${SID}/participants/bob`).set(part('bob'));
    await db.doc('sessionCodes/ABC234').set(codeDoc(SID, 'host'));
  });
}

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST as string).split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-swipeeats-rules',
    firestore: {
      host,
      port: Number(port),
      rules: readFileSync(join(__dirname, '../../../firestore.rules'), 'utf8'),
    },
  });
});
afterAll(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await seed();
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();

describe('reads', () => {
  it('non-participant cannot read the session, participants or swipes; unauthenticated neither', async () => {
    await assertFails(as('mallory').doc(`sessions/${SID}`).get());
    await assertFails(as('mallory').collection(`sessions/${SID}/participants`).get());
    await assertFails(as('mallory').doc(`sessions/${SID}/swipes/alice`).get());
    await assertFails(env.unauthenticatedContext().firestore().doc(`sessions/${SID}`).get());
  });
  it('participants can read the session, participants and swipes', async () => {
    await assertSucceeds(as('alice').doc(`sessions/${SID}`).get());
    await assertSucceeds(as('alice').collection(`sessions/${SID}/participants`).get());
    await assertSucceeds(as('alice').collection(`sessions/${SID}/swipes`).get());
  });
  it('session codes: any signed-in user can get, nobody can list; anon cannot get', async () => {
    const snap = await assertSucceeds(as('mallory').doc('sessionCodes/ABC234').get());
    // leak check: the public code doc must expose nothing but the session id
    expect(snap.data()).toEqual({ sessionId: SID });
    expect(JSON.stringify(snap.data())).not.toContain('anchor');
    expect(snap.data()).not.toHaveProperty('filters');
    await assertFails(as('mallory').collection('sessionCodes').get());
    await assertFails(env.unauthenticatedContext().firestore().doc('sessionCodes/ABC234').get());
  });
  it('a participant can read the anchor via the session doc; a non-participant cannot', async () => {
    const snap = await assertSucceeds(as('alice').doc(`sessions/${SID}`).get());
    expect(snap.data()?.filters.anchor).toEqual({ lat: 1, lng: 2 });
    await assertFails(as('mallory').doc(`sessions/${SID}`).get());
  });
  it('code doc cannot carry filters/anchor/hostId (cannot be written with location)', async () => {
    const db = as('newhost');
    const batch = db.batch();
    batch.set(db.doc('sessions/s9'), { ...sessionDoc(), hostId: 'newhost', code: 'LEAKYS' });
    batch.set(db.doc('sessionCodes/LEAKYS'), { sessionId: 's9', filters: baseFilters });
    batch.set(db.doc('sessions/s9/participants/newhost'), part('newhost'));
    await assertFails(batch.commit());
  });
  it('participants can still read once finished', async () => {
    await seed('finished');
    await assertSucceeds(as('alice').doc(`sessions/${SID}`).get());
  });
});

describe('swipes', () => {
  it('a participant can write their own swipes', async () => {
    await assertSucceeds(
      as('alice').doc(`sessions/${SID}/swipes/alice`).set({ pizza: 'LIKE' }, { merge: true }),
    );
  });
  it('participant A cannot write B swipes', async () => {
    await assertFails(as('alice').doc(`sessions/${SID}/swipes/bob`).set({ pizza: 'LIKE' }));
    await assertFails(
      as('alice').doc(`sessions/${SID}/swipes/bob`).set({ pizza: 'LIKE' }, { merge: true }),
    );
  });
  it('a non-participant cannot write even their own uid swipes doc', async () => {
    await assertFails(as('mallory').doc(`sessions/${SID}/swipes/mallory`).set({ pizza: 'LIKE' }));
  });
  it('rejects invalid swipe values', async () => {
    await assertFails(as('alice').doc(`sessions/${SID}/swipes/alice`).set({ pizza: 'MAYBE' }));
    await assertFails(as('alice').doc(`sessions/${SID}/swipes/alice`).set({ pizza: true }));
  });
  it('an inactive (left) participant cannot swipe', async () => {
    await env.withSecurityRulesDisabled((c) =>
      c.firestore().doc(`sessions/${SID}/participants/alice`).update({ active: false }),
    );
    await assertFails(as('alice').doc(`sessions/${SID}/swipes/alice`).set({ pizza: 'LIKE' }));
  });
  it('swipes cannot be deleted', async () => {
    await env.withSecurityRulesDisabled((c) =>
      c.firestore().doc(`sessions/${SID}/swipes/alice`).set({ pizza: 'LIKE' }),
    );
    await assertFails(as('alice').doc(`sessions/${SID}/swipes/alice`).delete());
  });
});

describe('participants / join', () => {
  it('a user can add only their own participant doc', async () => {
    await assertSucceeds(as('carol').doc(`sessions/${SID}/participants/carol`).set(part('carol')));
    await assertFails(as('carol').doc(`sessions/${SID}/participants/dave`).set(part('dave')));
  });
  it('a participant doc must be well-formed and id must equal uid', async () => {
    const ref = () => as('carol').doc(`sessions/${SID}/participants/carol`);
    await assertFails(ref().set({ ...part('carol'), id: 'someoneElse' }));
    await assertFails(ref().set({ ...part('carol'), admin: true }));
    await assertFails(ref().set({ ...part('carol'), active: false }));
  });
  it('a participant can flip only their own active flag', async () => {
    await assertSucceeds(as('alice').doc(`sessions/${SID}/participants/alice`).update({ active: false }));
    await assertFails(as('alice').doc(`sessions/${SID}/participants/bob`).update({ active: false }));
    await assertFails(as('bob').doc(`sessions/${SID}/participants/bob`).update({ name: 'renamed' }));
  });
  it('a participant cannot be deleted', async () => {
    await assertFails(as('alice').doc(`sessions/${SID}/participants/alice`).delete());
  });
  it('cannot join a finished or cancelled session', async () => {
    await seed('finished');
    await assertFails(as('carol').doc(`sessions/${SID}/participants/carol`).set(part('carol')));
    await seed('cancelled');
    await assertFails(as('carol').doc(`sessions/${SID}/participants/carol`).set(part('carol')));
  });
});

describe('session doc transitions', () => {
  it('host can end and cancel', async () => {
    await assertSucceeds(as('host').doc(`sessions/${SID}`).update({ status: 'finished' }));
    await seed();
    await assertSucceeds(as('host').doc(`sessions/${SID}`).update({ status: 'cancelled' }));
  });
  it('a non-host participant cannot end or cancel', async () => {
    await assertFails(as('alice').doc(`sessions/${SID}`).update({ status: 'finished' }));
    await assertFails(as('alice').doc(`sessions/${SID}`).update({ status: 'cancelled' }));
  });
  it('a non-host cannot change candidates/mode either', async () => {
    await assertFails(as('alice').doc(`sessions/${SID}`).update({ candidates: [] }));
    await assertFails(as('alice').doc(`sessions/${SID}`).update({ mode: 'place' }));
  });
  it('a non-participant cannot update the session', async () => {
    await assertFails(as('mallory').doc(`sessions/${SID}`).update({ status: 'finished' }));
  });
  it('host cannot change immutable fields (hostId, code, filters)', async () => {
    await assertFails(as('host').doc(`sessions/${SID}`).update({ hostId: 'alice' }));
    await assertFails(as('host').doc(`sessions/${SID}`).update({ code: 'ZZZZZZ' }));
    await assertFails(as('host').doc(`sessions/${SID}`).update({ 'filters.openNow': false }));
  });
  it('host cannot move status backwards or to an unknown value', async () => {
    await assertSucceeds(as('host').doc(`sessions/${SID}`).update({ status: 'active' }));
    await assertFails(as('host').doc(`sessions/${SID}`).update({ status: 'waiting' }));
    await assertFails(as('host').doc(`sessions/${SID}`).update({ status: 'bogus' }));
  });
  it('sessions cannot be deleted', async () => {
    await assertFails(as('host').doc(`sessions/${SID}`).delete());
  });
  it('create only as host, in waiting status, with bound code doc and host participant', async () => {
    const db = as('newhost');
    const batch = db.batch();
    batch.set(db.doc('sessions/s2'), { ...sessionDoc(), hostId: 'newhost', code: 'QQQQQQ' });
    batch.set(db.doc('sessionCodes/QQQQQQ'), codeDoc('s2', 'newhost'));
    batch.set(db.doc('sessions/s2/participants/newhost'), part('newhost'));
    await assertSucceeds(batch.commit());
    await assertFails(
      as('x').doc('sessions/s3').set({ ...sessionDoc(), hostId: 'someoneElse', code: 'WWWWWW' }),
    );
    await assertFails(
      as('x').doc('sessions/s4').set({ ...sessionDoc('finished'), hostId: 'x', code: 'EEEEEE' }),
    );
  });
  it('a code doc cannot be overwritten, hijacked or deleted', async () => {
    await assertFails(as('mallory').doc('sessionCodes/ABC234').set(codeDoc('evil', 'mallory')));
    await assertFails(as('host').doc('sessionCodes/ABC234').set(codeDoc(SID, 'host')));
    await assertFails(as('host').doc('sessionCodes/ABC234').delete());
  });
  it('cannot mint a code doc pointing at a session you do not host', async () => {
    await assertFails(as('mallory').doc('sessionCodes/NEWCDE').set(codeDoc(SID, 'mallory')));
    await assertFails(as('mallory').doc('sessionCodes/NEWCDE').set(codeDoc(SID, 'host')));
  });
});

describe('finished / cancelled sessions are read-only', () => {
  for (const status of ['finished', 'cancelled']) {
    it(`all writes denied when ${status}`, async () => {
      await seed(status);
      await assertFails(as('alice').doc(`sessions/${SID}/swipes/alice`).set({ pizza: 'LIKE' }));
      await assertFails(as('alice').doc(`sessions/${SID}/participants/alice`).update({ active: false }));
      await assertFails(as('host').doc(`sessions/${SID}`).update({ candidates: [] }));
      await assertFails(as('host').doc(`sessions/${SID}`).update({ status: 'active' }));
      await assertFails(as('host').doc(`sessions/${SID}`).update({ status: 'cancelled' }));
    });
  }
});
