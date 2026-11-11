import { buildPlacesQuery } from '../buildPlacesQuery';
import { placesToCandidates, winningCuisines } from '../placesRound';
import type { Filters, Session } from '../../../core/types';

const base: Filters = {
  unit: 'metric',
  cuisines: [],
  openNow: false,
  anchor: { lat: 40.7, lng: -74 },
};

describe('buildPlacesQuery', () => {
  it('converts maxWalkMin 12 to ~1000 m (5 km/h)', () => {
    const q = buildPlacesQuery({ ...base, maxWalkMin: 12 });
    expect(q.radiusMeters).toBeGreaterThanOrEqual(950);
    expect(q.radiusMeters).toBeLessThanOrEqual(1050);
  });

  it('prefers an explicit radius, falls back to a default', () => {
    expect(buildPlacesQuery({ ...base, radiusMeters: 2500, maxWalkMin: 5 }).radiusMeters).toBe(2500);
    expect(buildPlacesQuery(base).radiusMeters).toBe(1500);
  });

  it('forwards cuisines (as Places types), price, rating, openNow and anchor', () => {
    const q = buildPlacesQuery({
      ...base,
      cuisines: ['pizza', 'sushi', 'pizza'],
      maxPrice: 'PRICE_LEVEL_MODERATE',
      minRating: 4.2,
      openNow: true,
    });
    expect(q.includedTypes).toEqual(['pizza_restaurant', 'sushi_restaurant']);
    expect(q.maxPrice).toBe('PRICE_LEVEL_MODERATE');
    expect(q.minRating).toBe(4.2);
    expect(q.openNow).toBe(true);
    expect(q.anchor).toEqual(base.anchor);
  });

  it('ignores unknown cuisines', () => {
    expect(buildPlacesQuery({ ...base, cuisines: ['nope'] }).includedTypes).toEqual([]);
  });

  it('tight filters still yield a valid, well-formed query (risk case)', () => {
    const tight: Filters = { ...base, maxWalkMin: 1, openNow: true, cuisines: ['ramen'], minRating: 5, maxPrice: 'PRICE_LEVEL_INEXPENSIVE' };
    let q!: ReturnType<typeof buildPlacesQuery>;
    expect(() => (q = buildPlacesQuery(tight))).not.toThrow();
    expect(Number.isFinite(q.radiusMeters)).toBe(true);
    expect(q.radiusMeters).toBeGreaterThan(0);
    expect(q.includedTypes).toEqual(['ramen_restaurant']);
    expect(q.openNow).toBe(true);
    expect(q.anchor).toEqual(base.anchor);
    expect(JSON.parse(JSON.stringify(q))).toEqual(q);
  });
});

describe('placesRound', () => {
  const sess = (swipes: Session['swipes']): Session => ({
    id: 's', code: 'ABCDEF', hostId: 'a', status: 'active', mode: 'both', filters: base,
    participants: {
      a: { id: 'a', name: 'A', emoji: 'x', color: 'c', joinedAt: 1, active: true },
      b: { id: 'b', name: 'B', emoji: 'x', color: 'c', joinedAt: 1, active: true },
    },
    candidates: [], swipes,
  });

  it('winningCuisines prefers unanimous matches, else top liked (max 3)', () => {
    expect(winningCuisines(sess({ a: { pizza: 'LIKE', sushi: 'LIKE' }, b: { pizza: 'LIKE', sushi: 'PASS' } }))).toEqual(['pizza']);
    expect(
      winningCuisines(sess({ a: { pizza: 'LIKE', sushi: 'LIKE', thai: 'LIKE', bbq: 'LIKE' }, b: { pizza: 'PASS' } })),
    ).toHaveLength(3);
    expect(winningCuisines(sess({}))).toEqual([]);
  });

  it('placesToCandidates maps PlaceLite to place candidates', () => {
    const [c] = placesToCandidates([
      { id: 'p1', name: 'Joe', location: { lat: 1, lng: 2 }, photoRefs: [], rating: 4.5 },
    ]);
    expect(c).toMatchObject({ id: 'p1', kind: 'place', placeId: 'p1', name: 'Joe', rating: 4.5 });
  });
});
