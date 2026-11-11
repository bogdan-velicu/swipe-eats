import { DEFAULT_RANGE_METERS, fitRegion, rangeMeters } from '../rangeMeters';

const anchor = { lat: 40, lng: -74 };

describe('rangeMeters', () => {
  it('returns the explicit radius when set', () => {
    expect(rangeMeters({ anchor, radiusMeters: 2000, maxWalkMin: 5 })).toBe(2000);
  });
  it('derives from walking time (12 min ~ 1000 m)', () => {
    expect(rangeMeters({ anchor, maxWalkMin: 12 })).toBe(1000);
  });
  it('falls back to a sane default for 0 / undefined', () => {
    expect(rangeMeters({ anchor })).toBe(DEFAULT_RANGE_METERS);
    expect(rangeMeters({ anchor, radiusMeters: 0, maxWalkMin: 0 })).toBe(DEFAULT_RANGE_METERS);
    expect(DEFAULT_RANGE_METERS).toBeGreaterThan(0);
  });
});

describe('fitRegion', () => {
  it('frames the circle and widens longitude with latitude', () => {
    const r = fitRegion({ lat: 60, lng: 10 }, 1000);
    expect(r.latitudeDelta).toBeGreaterThan(2000 / 111320);
    expect(r.longitudeDelta).toBeCloseTo(r.latitudeDelta * 2, 1);
  });
});
