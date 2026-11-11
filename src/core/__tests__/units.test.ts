import {
  haversineMeters,
  formatDistance,
  walkingMinutes,
  defaultUnitSystem,
} from '../units';

describe('haversineMeters', () => {
  it('is 0 for identical points', () => {
    const p = { lat: 40.7128, lng: -74.006 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it('computes NYC -> LA within 1%', () => {
    const nyc = { lat: 40.7128, lng: -74.006 };
    const la = { lat: 34.0522, lng: -118.2437 };
    const expected = 3935746; // ~3936 km
    const d = haversineMeters(nyc, la);
    expect(Math.abs(d - expected) / expected).toBeLessThan(0.01);
  });

  it('computes a short hop (~1.11 km per 0.01 deg lat)', () => {
    const d = haversineMeters({ lat: 0, lng: 0 }, { lat: 0.01, lng: 0 });
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1120);
  });
});

describe('formatDistance', () => {
  it('formats imperial miles', () => {
    expect(formatDistance(1609, 'imperial')).toBe('1.0 mi');
    expect(formatDistance(3218, 'imperial')).toBe('2.0 mi');
  });
  it('formats imperial feet below ~0.1 mi', () => {
    expect(formatDistance(100, 'imperial')).toBe('330 ft');
    expect(formatDistance(0, 'imperial')).toBe('0 ft');
  });
  it('formats metric km', () => {
    expect(formatDistance(1500, 'metric')).toBe('1.5 km');
    expect(formatDistance(1000, 'metric')).toBe('1.0 km');
  });
  it('formats metric meters under 1 km, rounded to 10 m', () => {
    expect(formatDistance(850, 'metric')).toBe('850 m');
    expect(formatDistance(847, 'metric')).toBe('850 m');
    expect(formatDistance(0, 'metric')).toBe('0 m');
  });
});

describe('walkingMinutes', () => {
  it('uses 5 km/h', () => {
    expect(walkingMinutes(833)).toBe(10);
    expect(walkingMinutes(0)).toBe(0);
  });
  it('rounds to nearest minute', () => {
    expect(walkingMinutes(125)).toBe(2); // 1.5 -> 2
    expect(walkingMinutes(100)).toBe(1);
  });
});

describe('defaultUnitSystem', () => {
  it('imperial for US, Liberia, Myanmar', () => {
    expect(defaultUnitSystem('en-US')).toBe('imperial');
    expect(defaultUnitSystem('en_US')).toBe('imperial');
    expect(defaultUnitSystem('en-LR')).toBe('imperial');
    expect(defaultUnitSystem('my-MM')).toBe('imperial');
  });
  it('metric otherwise', () => {
    expect(defaultUnitSystem('en-GB')).toBe('metric');
    expect(defaultUnitSystem('ro-RO')).toBe('metric');
    expect(defaultUnitSystem('fr')).toBe('metric');
    expect(defaultUnitSystem('')).toBe('metric');
  });
});
