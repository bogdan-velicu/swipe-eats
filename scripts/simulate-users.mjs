// Dev utility: simulate extra participants in a live session so you can see the
// group ranking fill in. Each fake user is a real anonymous Firebase user that joins
// by code and records varied swipes. Usage:
//   node scripts/simulate-users.mjs <JOIN_CODE> [count]
// Reads the Firebase web config from .env (EXPO_PUBLIC_FIREBASE_*).
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^(EXPO_PUBLIC_FIREBASE_[A-Z_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch {}
  return env;
}
const e = loadEnv();
const cfg = {
  apiKey: e.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: e.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: e.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: e.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const code = (process.argv[2] || '').toUpperCase();
const count = Number(process.argv[3] || 3);
if (!code) { console.error('Usage: node scripts/simulate-users.mjs <JOIN_CODE> [count]'); process.exit(1); }

// Each fake user: a display identity and which candidate indexes they LIKE / MAYBE.
// Overlapping likes on the early candidates produce a clear leaderboard.
const PEOPLE = [
  { name: 'Ana', emoji: '🦊', color: '#ff6b6b', like: [0, 1, 2], maybe: [3] },
  { name: 'Dan', emoji: '🐸', color: '#2ecc71', like: [0, 1, 4], maybe: [2] },
  { name: 'Mia', emoji: '🦄', color: '#7c5cff', like: [0, 2, 5], maybe: [1] },
  { name: 'Leo', emoji: '🐼', color: '#ffd166', like: [0, 3, 4], maybe: [5] },
];

async function run() {
  for (let i = 0; i < count; i++) {
    const p = PEOPLE[i % PEOPLE.length];
    const app = initializeApp(cfg, `sim-${i}-${Date.now()}`);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const { user } = await signInAnonymously(auth);
    const uid = user.uid;

    const codeSnap = await getDoc(doc(db, 'sessionCodes', code));
    const sid = codeSnap.data()?.sessionId;
    if (!sid) { console.log(`[${p.name}] code ${code} not found`); continue; }

    await setDoc(doc(db, 'sessions', sid, 'participants', uid), {
      id: uid, name: p.name, emoji: p.emoji, color: p.color, joinedAt: Date.now(), active: true,
    });

    const session = (await getDoc(doc(db, 'sessions', sid))).data();
    const candidates = session?.candidates ?? [];
    const swipes = {};
    candidates.forEach((c, idx) => {
      swipes[c.id] = p.like.includes(idx) ? 'LIKE' : p.maybe.includes(idx) ? 'MAYBE' : 'PASS';
    });
    await setDoc(doc(db, 'sessions', sid, 'swipes', uid), swipes, { merge: true });

    const likes = p.like.map((idx) => candidates[idx]?.name).filter(Boolean);
    console.log(`[${p.name} ${p.emoji}] joined ${sid} — liked: ${likes.join(', ')}`);
  }
  process.exit(0);
}
run().catch((err) => { console.error('sim failed:', err.message || err); process.exit(1); });
