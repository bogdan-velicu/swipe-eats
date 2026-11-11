/** @jest-environment node */
import { fetchPlaceReviews, fetchPlacePhotoUrls, searchPlacesCore } from '../places';

const KEY = 'test-places-key';

function placeFixture(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    displayName: { text: `Place ${id}` },
    location: { latitude: 45.0, longitude: 9.0 },
    rating: 4.5,
    userRatingCount: 120,
    priceLevel: 'PRICE_LEVEL_MODERATE',
    primaryType: 'pizza_restaurant',
    photos: [{ name: `places/${id}/photos/p1` }, { name: `places/${id}/photos/p2` }],
    formattedAddress: '1 Via Roma',
    ...over,
  };
}

function mockFetch(...bodies: unknown[]) {
  const fn = jest.fn();
  for (const b of bodies) fn.mockResolvedValueOnce({ ok: true, status: 200, json: async () => b });
  return fn as unknown as typeof fetch & jest.Mock;
}

const base = { anchor: { lat: 45.0, lng: 9.0 }, radiusMeters: 2000, includedTypes: ['pizza_restaurant'] };

describe('searchPlacesCore', () => {
  it('maps a Places response to PlaceLite[] and forwards filters', async () => {
    const f = mockFetch({ places: [placeFixture('a')], nextPageToken: 'tok' });
    const out = await searchPlacesCore({ ...base, openNow: true, minRating: 4 }, { fetch: f, apiKey: KEY });
    expect(out).toEqual({
      places: [
        {
          id: 'a',
          name: 'Place a',
          location: { lat: 45.0, lng: 9.0 },
          rating: 4.5,
          userRatingCount: 120,
          priceLevel: 'PRICE_LEVEL_MODERATE',
          primaryType: 'pizza_restaurant',
          photoRefs: ['places/a/photos/p1', 'places/a/photos/p2'],
          address: '1 Via Roma',
        },
      ],
      nextPageToken: 'tok',
    });
    const [url, init] = f.mock.calls[0];
    expect(url).toContain('places:searchText');
    const body = JSON.parse(init.body);
    expect(body.includedType).toBe('pizza_restaurant');
    expect(body.openNow).toBe(true);
    expect(body.minRating).toBe(4);
    expect(body.locationBias.circle.radius).toBe(2000);
    expect(body.locationBias.circle.center).toEqual({ latitude: 45, longitude: 9 });
  });

  it('sends the key only in a header to Google and never returns it', async () => {
    const f = mockFetch({ places: [placeFixture('a')] });
    const out = await searchPlacesCore(base, { fetch: f, apiKey: KEY });
    const [url, init] = f.mock.calls[0];
    expect(url).not.toContain(KEY);
    expect(init.headers['X-Goog-Api-Key']).toBe(KEY);
    expect(JSON.stringify(out)).not.toContain(KEY);
  });

  it('filters by minRating and maxPrice', async () => {
    const f = mockFetch({
      places: [
        placeFixture('good'),
        placeFixture('low', { rating: 3.2 }),
        placeFixture('pricey', { priceLevel: 'PRICE_LEVEL_VERY_EXPENSIVE' }),
        placeFixture('noprice', { priceLevel: undefined }),
      ],
    });
    const out = await searchPlacesCore(
      { ...base, minRating: 4, maxPrice: 'PRICE_LEVEL_MODERATE' },
      { fetch: f, apiKey: KEY },
    );
    expect(out.places.map((p) => p.id)).toEqual(['good', 'noprice']);
  });

  it('dedupes by id (within a response and across pages)', async () => {
    const f = mockFetch(
      { places: [placeFixture('a'), placeFixture('a'), placeFixture('b')], nextPageToken: 't2' },
      { places: [placeFixture('b'), placeFixture('c')] },
    );
    const page1 = await searchPlacesCore(base, { fetch: f, apiKey: KEY });
    expect(page1.places.map((p) => p.id)).toEqual(['a', 'b']);
    const page2 = await searchPlacesCore(
      { ...base, pageToken: page1.nextPageToken, seenIds: page1.places.map((p) => p.id) },
      { fetch: f, apiKey: KEY },
    );
    expect(page2.places.map((p) => p.id)).toEqual(['c']);
    expect(JSON.parse(f.mock.calls[1][1].body).pageToken).toBe('t2');
  });

  it('handles an empty response', async () => {
    const f = mockFetch({});
    const out = await searchPlacesCore(base, { fetch: f, apiKey: KEY });
    expect(out).toEqual({ places: [] });
  });

  it('throws without leaking the key when Google errors', async () => {
    const f = jest.fn().mockResolvedValue({ ok: false, status: 403, text: async () => `denied ${KEY}` });
    const err = await searchPlacesCore(base, { fetch: f as never, apiKey: KEY }).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(String(err.message)).not.toContain(KEY);
  });
});

describe('photos and reviews', () => {
  it('resolves fresh keyless photo URLs', async () => {
    const f = mockFetch(
      { photos: [{ name: 'places/a/photos/p1' }, { name: 'places/a/photos/p2' }] },
      { photoUri: 'https://lh3.example/p1' },
      { photoUri: 'https://lh3.example/p2' },
    );
    const urls = await fetchPlacePhotoUrls('a', { fetch: f, apiKey: KEY });
    expect(urls).toEqual(['https://lh3.example/p1', 'https://lh3.example/p2']);
    expect(JSON.stringify(urls)).not.toContain(KEY);
    expect(f.mock.calls[1][0]).toContain('skipHttpRedirect=true');
  });

  it('returns up to 5 reviews with attributions', async () => {
    const reviews = Array.from({ length: 7 }, (_, i) => ({
      rating: 5,
      text: { text: `r${i}` },
      relativePublishTimeDescription: 'a week ago',
      authorAttribution: { displayName: `A${i}`, uri: 'https://maps/u', photoUri: 'https://p' },
    }));
    const f = mockFetch({ reviews });
    const out = await fetchPlaceReviews('a', { fetch: f, apiKey: KEY });
    expect(out).toHaveLength(5);
    expect(out[0]).toEqual({
      rating: 5,
      text: 'r0',
      relativeTime: 'a week ago',
      attributions: { authorName: 'A0', authorUri: 'https://maps/u', authorPhotoUri: 'https://p' },
    });
  });
});
