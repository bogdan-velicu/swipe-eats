// Google Places (New) v1 proxy logic. Pure functions with an injectable fetch + key so they are
// unit-testable without the network. The API key lives ONLY in the function runtime (env/secret):
// it is sent to Google in a request header and is never included in any returned value or error.

export interface LatLng {
  lat: number;
  lng: number;
}

export interface SearchInput {
  anchor: LatLng;
  radiusMeters: number;
  includedTypes: string[];
  maxPrice?: string;
  minRating?: number;
  openNow?: boolean;
  pageToken?: string;
  /** Ids the caller already holds (earlier pages); these are dropped from the result. */
  seenIds?: string[];
}

export interface PlaceLite {
  id: string;
  name: string;
  location: LatLng;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  primaryType?: string;
  photoRefs: string[];
  address?: string;
}

export interface SearchOutput {
  places: PlaceLite[];
  nextPageToken?: string;
}

export interface Review {
  rating?: number;
  text?: string;
  relativeTime?: string;
  attributions: { authorName?: string; authorUri?: string; authorPhotoUri?: string };
}

export interface Deps {
  fetch: typeof fetch;
  apiKey: string;
}

const BASE = 'https://places.googleapis.com/v1';
const PRICE_ORDER = [
  'PRICE_LEVEL_FREE',
  'PRICE_LEVEL_INEXPENSIVE',
  'PRICE_LEVEL_MODERATE',
  'PRICE_LEVEL_EXPENSIVE',
  'PRICE_LEVEL_VERY_EXPENSIVE',
];
const SEARCH_FIELDS = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.primaryType',
  'places.photos.name',
  'places.formattedAddress',
  'nextPageToken',
].join(',');
const MAX_PHOTOS = 5;
const MAX_REVIEWS = 5;

async function call(deps: Deps, url: string, init: { method: string; body?: unknown; fieldMask?: string }) {
  const headers: Record<string, string> = { 'X-Goog-Api-Key': deps.apiKey };
  if (init.fieldMask) headers['X-Goog-FieldMask'] = init.fieldMask;
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await deps.fetch(url, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!res.ok) {
    // Deliberately drop the upstream body: it can echo request details.
    throw new Error(`Places API request failed (${res.status})`);
  }
  return (await res.json()) as any;
}

function humanize(type: string): string {
  return type.replace(/_/g, ' ');
}

function priceRank(level?: string): number {
  return level ? PRICE_ORDER.indexOf(level) : -1;
}

function toPlaceLite(p: any): PlaceLite | null {
  if (!p?.id || !p.location) return null;
  return {
    id: p.id,
    name: p.displayName?.text ?? '',
    location: { lat: p.location.latitude, lng: p.location.longitude },
    rating: p.rating,
    userRatingCount: p.userRatingCount,
    priceLevel: p.priceLevel,
    primaryType: p.primaryType,
    photoRefs: (p.photos ?? []).map((ph: any) => ph.name).filter(Boolean),
    address: p.formattedAddress,
  };
}

export async function searchPlacesCore(input: SearchInput, deps: Deps): Promise<SearchOutput> {
  const body: Record<string, unknown> = {
    textQuery:
      input.includedTypes.length > 0 ? input.includedTypes.map(humanize).join(' or ') : 'restaurant',
    locationBias: {
      circle: {
        center: { latitude: input.anchor.lat, longitude: input.anchor.lng },
        radius: input.radiusMeters,
      },
    },
    pageSize: 20,
  };
  // searchText accepts a single includedType; with several, the text query carries them.
  if (input.includedTypes.length === 1) body.includedType = input.includedTypes[0];
  if (input.openNow) body.openNow = true;
  if (input.minRating != null) body.minRating = input.minRating;
  if (input.maxPrice) {
    const max = priceRank(input.maxPrice);
    if (max >= 0) body.priceLevels = PRICE_ORDER.slice(1, max + 1);
  }
  if (input.pageToken) body.pageToken = input.pageToken;

  const json = await call(deps, `${BASE}/places:searchText`, {
    method: 'POST',
    body,
    fieldMask: SEARCH_FIELDS,
  });

  const seen = new Set(input.seenIds ?? []);
  const maxRank = input.maxPrice ? priceRank(input.maxPrice) : -1;
  const places: PlaceLite[] = [];
  for (const raw of json.places ?? []) {
    const p = toPlaceLite(raw);
    if (!p || seen.has(p.id)) continue;
    // Server-side filters are advisory; enforce them again so results are always correct.
    if (input.minRating != null && (p.rating ?? 0) < input.minRating) continue;
    if (maxRank >= 0 && priceRank(p.priceLevel) > maxRank) continue;
    seen.add(p.id);
    places.push(p);
  }
  const out: SearchOutput = { places };
  if (json.nextPageToken) out.nextPageToken = json.nextPageToken;
  return out;
}

/** Fresh, keyless photo URLs (Google short-lived photoUri). Nothing is stored. */
export async function fetchPlacePhotoUrls(placeId: string, deps: Deps): Promise<string[]> {
  const place = await call(deps, `${BASE}/places/${encodeURIComponent(placeId)}`, {
    method: 'GET',
    fieldMask: 'photos.name',
  });
  const names: string[] = (place.photos ?? []).map((p: any) => p.name).slice(0, MAX_PHOTOS);
  const urls: string[] = [];
  for (const name of names) {
    const media = await call(deps, `${BASE}/${name}/media?maxWidthPx=800&skipHttpRedirect=true`, {
      method: 'GET',
    });
    if (media.photoUri) urls.push(media.photoUri);
  }
  return urls;
}

/** Up to 5 reviews as Google returns them, with author attributions. Nothing is stored. */
export async function fetchPlaceReviews(placeId: string, deps: Deps): Promise<Review[]> {
  const place = await call(deps, `${BASE}/places/${encodeURIComponent(placeId)}`, {
    method: 'GET',
    fieldMask: 'reviews',
  });
  return (place.reviews ?? []).slice(0, MAX_REVIEWS).map((r: any) => ({
    rating: r.rating,
    text: r.text?.text,
    relativeTime: r.relativePublishTimeDescription,
    attributions: {
      authorName: r.authorAttribution?.displayName,
      authorUri: r.authorAttribution?.uri,
      authorPhotoUri: r.authorAttribution?.photoUri,
    },
  }));
}
