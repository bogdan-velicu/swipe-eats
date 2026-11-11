import { distanceLabel } from '../distanceLabel';

const a = { lat: 40.0, lng: -74.0 };
const b = { lat: 40.009, lng: -74.0 }; // ~1 km north

describe('distanceLabel', () => {
  it('renders in the active unit system', () => {
    expect(distanceLabel(a, b, 'metric')).toMatch(/^1\.0 km · \d+ min walk$/);
    expect(distanceLabel(a, b, 'imperial')).toMatch(/^0\.6 mi · \d+ min walk$/);
  });
  it('is undefined without both points', () => {
    expect(distanceLabel(undefined, b, 'metric')).toBeUndefined();
    expect(distanceLabel(a, undefined, 'metric')).toBeUndefined();
  });
});
