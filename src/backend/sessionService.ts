import { getRandomBytes } from 'expo-crypto';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { generateSessionCode } from '../core/sessionCode';
import type { Candidate, Filters, Participant, Session, SwipeDir } from '../core/types';
import { ensureAnonymousAuth } from './auth';
import { db } from './firebase';

/**
 * Firestore layout (enforced by firestore.rules):
 *   sessions/{id}                      code, hostId, status, mode, filters, candidates
 *   sessions/{id}/participants/{uid}   Participant
 *   sessions/{id}/swipes/{uid}         { candidateId: SwipeDir }
 *   sessionCodes/{code}                { sessionId, hostId, mode, filters }  (code -> id lookup)
 * `observeSession` / `findSessionByCode` recompose the logical `Session` that core/matching uses.
 */

export interface CreateSessionInput {
  host: Pick<Participant, 'name' | 'emoji' | 'color'>;
  mode: Session['mode'];
  filters: Filters;
  candidates?: Candidate[];
}

const MAX_CODE_ATTEMPTS = 5;

/** Float in [0, 1) from a CSPRNG (expo-crypto), exactly uniform over 2^32 values. */
function cryptoRng(): number {
  const b = getRandomBytes(4);
  return ((b[0] * 2 ** 24 + b[1] * 2 ** 16 + b[2] * 2 ** 8 + b[3]) >>> 0) / 2 ** 32;
}

/** Firestore rejects `undefined`; drop it recursively (arrays/maps). */
function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clean) as unknown as T;
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val !== undefined) out[k] = clean(val);
    }
    return out as T;
  }
  return v;
}

const sessionRef = (id: string) => doc(db, 'sessions', id);
const participantRef = (id: string, uid: string) => doc(db, 'sessions', id, 'participants', uid);
const swipesRef = (id: string, uid: string) => doc(db, 'sessions', id, 'swipes', uid);

function composeSession(
  id: string,
  meta: DocumentData,
  parts: QuerySnapshot,
  swipes: QuerySnapshot,
): Session {
  const participants: Session['participants'] = {};
  parts.forEach((d) => {
    participants[d.id] = d.data() as Participant;
  });
  const swipeMap: Session['swipes'] = {};
  swipes.forEach((d) => {
    swipeMap[d.id] = d.data() as Record<string, SwipeDir>;
  });
  return {
    id,
    code: meta.code,
    hostId: meta.hostId,
    status: meta.status,
    mode: meta.mode,
    filters: meta.filters,
    candidates: meta.candidates ?? [],
    participants,
    swipes: swipeMap,
  };
}

export async function createSession(input: CreateSessionInput): Promise<Session> {
  const uid = await ensureAnonymousAuth();
  const id = doc(collection(db, 'sessions')).id;

  let code = '';
  for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
    const candidate = generateSessionCode(6, cryptoRng);
    if (!(await getDoc(doc(db, 'sessionCodes', candidate))).exists()) {
      code = candidate;
      break;
    }
  }
  if (!code) throw new Error('Could not allocate a unique session code');

  const host: Participant = {
    id: uid,
    name: input.host.name,
    emoji: input.host.emoji,
    color: input.host.color,
    joinedAt: Date.now(),
    active: true,
  };
  const candidates = clean(input.candidates ?? []);
  const filters = clean(input.filters);

  const batch = writeBatch(db);
  batch.set(sessionRef(id), {
    code,
    hostId: uid,
    status: 'waiting',
    mode: input.mode,
    filters,
    candidates,
  });
  batch.set(doc(db, 'sessionCodes', code), { sessionId: id, hostId: uid, mode: input.mode, filters });
  batch.set(participantRef(id, uid), host);
  await batch.commit();

  return {
    id,
    code,
    hostId: uid,
    status: 'waiting',
    mode: input.mode,
    filters: input.filters,
    participants: { [uid]: host },
    candidates: input.candidates ?? [],
    swipes: {},
  };
}

/**
 * Resolve a join code. A caller who is not yet a participant cannot read the session doc (by
 * design), so for them this returns a lobby stub built from the public code doc: real id, code,
 * hostId, mode and filters, but status 'waiting' and empty participants/candidates/swipes.
 * Participants (e.g. the host) get the full session.
 */
export async function findSessionByCode(code: string): Promise<Session | null> {
  await ensureAnonymousAuth();
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const codeSnap = await getDoc(doc(db, 'sessionCodes', normalized));
  if (!codeSnap.exists()) return null;
  const c = codeSnap.data();
  const id = c.sessionId as string;
  try {
    const [meta, parts, swipes] = await Promise.all([
      getDoc(sessionRef(id)),
      getDocs(collection(db, 'sessions', id, 'participants')),
      getDocs(collection(db, 'sessions', id, 'swipes')),
    ]);
    if (meta.exists()) return composeSession(id, meta.data(), parts, swipes);
  } catch (e) {
    if ((e as { code?: string }).code !== 'permission-denied') throw e;
  }
  return {
    id,
    code: normalized,
    hostId: c.hostId,
    status: 'waiting',
    mode: c.mode,
    filters: c.filters,
    participants: {},
    candidates: [],
    swipes: {},
  };
}

/** Adds the caller as a participant (or re-activates them). `participant.id` is ignored: uid wins. */
export async function joinSession(id: string, participant: Omit<Participant, 'id'> | Participant): Promise<void> {
  const uid = await ensureAnonymousAuth();
  const ref = participantRef(id, uid);
  if ((await getDoc(ref)).exists()) {
    await updateDoc(ref, { active: true });
    return;
  }
  await setDoc(ref, {
    id: uid,
    name: participant.name,
    emoji: participant.emoji,
    color: participant.color,
    joinedAt: participant.joinedAt,
    active: true,
  });
}

/**
 * Realtime logical Session. Emits once the session doc, participants and swipes have each
 * delivered a snapshot, then on every change. `null` means the session doc does not exist.
 * Caller must already be a participant (rules).
 */
export function observeSession(
  id: string,
  cb: (session: Session | null) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  let meta: DocumentData | null | undefined;
  let parts: QuerySnapshot | undefined;
  let swipes: QuerySnapshot | undefined;
  const emit = () => {
    if (meta === undefined || !parts || !swipes) return;
    cb(meta === null ? null : composeSession(id, meta, parts, swipes));
  };
  const err = (e: Error) => onError?.(e);
  const u1 = onSnapshot(sessionRef(id), (s) => {
    meta = s.exists() ? s.data() : null;
    emit();
  }, err);
  const u2 = onSnapshot(collection(db, 'sessions', id, 'participants'), (s) => {
    parts = s;
    emit();
  }, err);
  const u3 = onSnapshot(collection(db, 'sessions', id, 'swipes'), (s) => {
    swipes = s;
    emit();
  }, err);
  return () => {
    u1();
    u2();
    u3();
  };
}

/** Writes ONLY the caller's own swipes doc. */
export async function recordSwipe(id: string, candidateId: string, dir: SwipeDir): Promise<void> {
  const uid = await ensureAnonymousAuth();
  await setDoc(swipesRef(id, uid), { [candidateId]: dir }, { merge: true });
}

export async function leaveSession(id: string): Promise<void> {
  const uid = await ensureAnonymousAuth();
  await updateDoc(participantRef(id, uid), { active: false });
}

/** Host only (rules). */
export async function setCandidates(id: string, candidates: Candidate[]): Promise<void> {
  await ensureAnonymousAuth();
  await updateDoc(sessionRef(id), { candidates: clean(candidates) });
}

/** Host only (rules). Switches the session to the places round and activates it. */
export async function startPlacesRound(id: string): Promise<void> {
  await ensureAnonymousAuth();
  await updateDoc(sessionRef(id), { mode: 'place', status: 'active' });
}

/** Host only (rules). */
export async function endSession(id: string): Promise<void> {
  await ensureAnonymousAuth();
  await updateDoc(sessionRef(id), { status: 'finished' });
}

/** Host only (rules). */
export async function cancelSession(id: string): Promise<void> {
  await ensureAnonymousAuth();
  await updateDoc(sessionRef(id), { status: 'cancelled' });
}
