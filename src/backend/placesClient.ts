import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Filters, LatLng } from '../core/types';
import { buildPlacesQuery, type SearchPlacesInput } from '../features/filters/buildPlacesQuery';
import { app } from './firebase';

// The Places API key never reaches the client: all Places access goes through these callables.

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

export interface Review {
  rating?: number;
  text?: string;
  relativeTime?: string;
  attributions: { authorName?: string; authorUri?: string; authorPhotoUri?: string };
}

const MAX_PAGES = 3;

const functions = () => getFunctions(app);

/** Accepts raw Filters (converted via buildPlacesQuery) or an already-built query. */
export async function searchPlaces(input: Filters | SearchPlacesInput): Promise<PlaceLite[]> {
  const request: SearchPlacesInput = 'includedTypes' in input ? input : buildPlacesQuery(input);
  const call = httpsCallable<unknown, { places?: PlaceLite[]; nextPageToken?: string } | null>(
    functions(),
    'searchPlaces',
  );
  const byId = new Map<string, PlaceLite>();
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await call({ ...request, ...(pageToken ? { pageToken, seenIds: [...byId.keys()] } : {}) });
    for (const p of res.data?.places ?? []) if (!byId.has(p.id)) byId.set(p.id, p);
    pageToken = res.data?.nextPageToken;
    if (!pageToken) break;
  }
  return [...byId.values()];
}

export interface GeoResult {
  lat: number;
  lng: number;
  label?: string;
}

/** Server-side address → coordinates (works without device GPS/geocoder). */
export async function geocode(address: string): Promise<GeoResult | null> {
  const res = await httpsCallable<{ address: string }, { result?: GeoResult | null } | null>(
    functions(),
    'geocode',
  )({ address });
  return res.data?.result ?? null;
}

export async function placePhotoUrls(placeId: string): Promise<string[]> {
  const res = await httpsCallable<{ placeId: string }, { urls?: string[] } | null>(
    functions(),
    'placePhotos',
  )({ placeId });
  return res.data?.urls ?? [];
}

export async function placeReviews(placeId: string): Promise<Review[]> {
  const res = await httpsCallable<{ placeId: string }, { reviews?: Review[] } | null>(
    functions(),
    'placeReviews',
  )({ placeId });
  return res.data?.reviews ?? [];
}
