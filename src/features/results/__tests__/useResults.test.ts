import { computeResults } from '../useResults';
import type { Candidate, Session } from '../../../core/types';

const cand = (id: string): Candidate => ({ id, kind: 'place', name: `Place ${id}`, placeId: `p${id}` });
const P = (id: string, active = true) => ({ id, name: id, emoji: 'x', color: '#fff', joinedAt: 0, active });

function mk(participants: string[], swipes: Session['swipes'], ids = ['a', 'b', 'c']): Session {
  return {
    id: 's',
    participants: Object.fromEntries(participants.map((p) => [p, P(p)])),
    candidates: ids.map(cand),
    swipes,
  } as unknown as Session;
}

describe('computeResults', () => {
  it('surfaces unanimous matches and an ordered leaderboard as Candidate objects', () => {
    const r = computeResults(
      mk(['u1', 'u2'], {
        u1: { a: 'LIKE', b: 'LIKE', c: 'PASS' },
        u2: { a: 'LIKE', b: 'PASS', c: 'PASS' },
      }),
    );
    expect(r.matches.map((c) => c.id)).toEqual(['a']);
    expect(r.matches[0]).toEqual(cand('a'));
    expect(r.leaderboard.map((e) => [e.candidate.id, e.likes])).toEqual([
      ['a', 2],
      ['b', 1],
    ]);
    expect(r.soloPicks).toEqual([]);
  });

  it('solo session: every like is a pick, no match gating', () => {
    const r = computeResults(mk(['u1'], { u1: { a: 'LIKE', b: 'PASS', c: 'LIKE' } }));
    expect(r.soloPicks.map((c) => c.id)).toEqual(['a', 'c']);
    expect(r.matches.map((c) => c.id)).toEqual(['a', 'c']);
  });

  it('ignores ids that are not in session.candidates', () => {
    const r = computeResults(mk(['u1'], { u1: { zzz: 'LIKE' } }));
    expect(r.leaderboard).toEqual([]);
    expect(r.soloPicks).toEqual([]);
  });

  it('inactive participants do not make a group solo-by-count', () => {
    const s = mk(['u1', 'u2'], { u1: { a: 'LIKE' } });
    s.participants.u2.active = false;
    expect(computeResults(s).soloPicks.map((c) => c.id)).toEqual(['a']);
  });
});
