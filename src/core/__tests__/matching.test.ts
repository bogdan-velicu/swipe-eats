import { activeParticipantIds, applySwipe, leaderboard, matches } from '../matching';
import type { Participant, Session, SwipeDir } from '../types';

function p(id: string, active = true): Participant {
  return { id, name: id, emoji: '🍕', color: '#fff', joinedAt: 0, active };
}

function makeSession(
  ids: string[],
  swipes: Record<string, Record<string, SwipeDir>> = {},
): Session {
  return {
    id: 's1',
    code: 'ABCD',
    hostId: ids[0] ?? 'h',
    status: 'active',
    mode: 'foodType',
    filters: { unit: 'metric', cuisines: [], openNow: false, anchor: { lat: 0, lng: 0 } },
    participants: Object.fromEntries(ids.map((id) => [id, p(id)])),
    candidates: [],
    swipes,
  } as Session;
}

describe('matching', () => {
  it('unanimous like is a match; one PASS excludes', () => {
    const s = makeSession(['a', 'b', 'c'], {
      a: { X: 'LIKE', Y: 'LIKE' },
      b: { X: 'LIKE', Y: 'LIKE' },
      c: { X: 'LIKE', Y: 'PASS' },
    });
    expect(matches(s)).toContain('X');
    expect(matches(s)).not.toContain('Y');
  });

  it('leaving mid-swipe shrinks the denominator', () => {
    const s = makeSession(['a', 'b', 'c'], {
      a: { X: 'LIKE' },
      b: { X: 'LIKE' },
      c: { X: 'PASS' },
    });
    expect(matches(s)).not.toContain('X');
    const left: Session = {
      ...s,
      participants: { ...s.participants, c: { ...s.participants.c, active: false } },
    };
    expect(activeParticipantIds(left)).toEqual(['a', 'b']);
    expect(matches(left)).toContain('X');
  });

  it('re-swiping is idempotent and does not mutate input', () => {
    const s = makeSession(['a', 'b']);
    const once = applySwipe(s, 'a', 'X', 'LIKE');
    const twice = applySwipe(once, 'a', 'X', 'LIKE');
    expect(leaderboard(twice).find((e) => e.candidateId === 'X')?.likes).toBe(1);
    expect(s.swipes).toEqual({});
    const flipped = applySwipe(twice, 'a', 'X', 'PASS');
    expect(flipped.swipes.a.X).toBe('PASS');
    expect(twice.swipes.a.X).toBe('LIKE');
  });

  it('leaderboard is ordered by likes desc', () => {
    const s = makeSession(['a', 'b', 'c'], {
      a: { X: 'LIKE', Y: 'LIKE', Z: 'LIKE' },
      b: { X: 'LIKE', Y: 'LIKE', Z: 'PASS' },
      c: { X: 'LIKE', Y: 'PASS' },
    });
    expect(leaderboard(s)).toEqual([
      { candidateId: 'X', likes: 3 },
      { candidateId: 'Y', likes: 2 },
      { candidateId: 'Z', likes: 1 },
    ]);
  });

  it('empty session yields no matches or leaderboard', () => {
    const s = makeSession([]);
    expect(matches(s)).toEqual([]);
    expect(leaderboard(s)).toEqual([]);
    expect(matches(makeSession(['a', 'b']))).toEqual([]);
  });
});
