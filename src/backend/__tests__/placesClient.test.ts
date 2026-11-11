import { httpsCallable } from 'firebase/functions';
import { placePhotoUrls, placeReviews, searchPlaces } from '../placesClient';
import type { Filters } from '../../core/types';

jest.mock('firebase/functions', () => ({ getFunctions: jest.fn(() => ({})), httpsCallable: jest.fn() }));
jest.mock('../firebase', () => ({ app: {} }));

const callable = httpsCallable as unknown as jest.Mock;
const filters: Filters = {
  unit: 'metric',
  radiusMeters: 1500,
  cuisines: ['pizza'],
  openNow: true,
  minRating: 4,
  anchor: { lat: 1, lng: 2 },
};
const lite = (id: string) => ({ id, name: id, location: { lat: 1, lng: 2 }, photoRefs: [] });

function mockCalls(fns: Record<string, jest.Mock>) {
  callable.mockImplementation((_f: unknown, name: string) => fns[name]);
}

describe('placesClient', () => {
  beforeEach(() => callable.mockReset());

  it('searchPlaces surfaces PlaceLite[] and maps filters', async () => {
    const search = jest.fn().mockResolvedValue({ data: { places: [lite('a')] } });
    mockCalls({ searchPlaces: search });
    const out = await searchPlaces(filters);
    expect(out.map((p) => p.id)).toEqual(['a']);
    expect(search.mock.calls[0][0]).toMatchObject({
      anchor: { lat: 1, lng: 2 },
      radiusMeters: 1500,
      includedTypes: ['pizza_restaurant'],
      openNow: true,
      minRating: 4,
    });
  });

  it('follows pages and dedupes by id', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce({ data: { places: [lite('a'), lite('b')], nextPageToken: 't' } })
      .mockResolvedValueOnce({ data: { places: [lite('b'), lite('c')] } });
    mockCalls({ searchPlaces: search });
    const out = await searchPlaces(filters);
    expect(out.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(search.mock.calls[1][0].pageToken).toBe('t');
  });

  it('empty response -> [] without throwing', async () => {
    mockCalls({ searchPlaces: jest.fn().mockResolvedValue({ data: {} }) });
    await expect(searchPlaces(filters)).resolves.toEqual([]);
    mockCalls({
      placePhotos: jest.fn().mockResolvedValue({ data: null }),
      placeReviews: jest.fn().mockResolvedValue({ data: {} }),
    });
    await expect(placePhotoUrls('a')).resolves.toEqual([]);
    await expect(placeReviews('a')).resolves.toEqual([]);
  });
});
