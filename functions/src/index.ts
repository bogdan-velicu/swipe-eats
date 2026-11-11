import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { fetchPlacePhotoUrls, fetchPlaceReviews, searchPlacesCore, type SearchInput } from './places';

// Set with: firebase functions:secrets:set PLACES_API_KEY  (never committed, never in the client).
const placesKey = defineSecret('PLACES_API_KEY');
const opts = { secrets: [placesKey], region: 'us-central1' };

function deps() {
  return { fetch: globalThis.fetch, apiKey: placesKey.value() };
}

function requireAuth(auth: unknown) {
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in first.');
}

function requirePlaceId(data: unknown): string {
  const id = typeof data === 'string' ? data : (data as { placeId?: unknown } | null)?.placeId;
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(id)) {
    throw new HttpsError('invalid-argument', 'placeId required.');
  }
  return id;
}

export const searchPlaces = onCall(opts, async (req) => {
  requireAuth(req.auth);
  const d = req.data as SearchInput;
  if (!d?.anchor || typeof d.radiusMeters !== 'number' || !Array.isArray(d.includedTypes)) {
    throw new HttpsError('invalid-argument', 'anchor, radiusMeters, includedTypes required.');
  }
  try {
    return await searchPlacesCore(d, deps());
  } catch {
    throw new HttpsError('internal', 'Places search failed.');
  }
});

export const placePhotos = onCall(opts, async (req) => {
  requireAuth(req.auth);
  const id = requirePlaceId(req.data);
  try {
    return { urls: await fetchPlacePhotoUrls(id, deps()) };
  } catch {
    throw new HttpsError('internal', 'Places photos failed.');
  }
});

export const placeReviews = onCall(opts, async (req) => {
  requireAuth(req.auth);
  const id = requirePlaceId(req.data);
  try {
    return { reviews: await fetchPlaceReviews(id, deps()) };
  } catch {
    throw new HttpsError('internal', 'Places reviews failed.');
  }
});
