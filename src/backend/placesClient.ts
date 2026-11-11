import { getFunctions, httpsCallable } from 'firebase/functions';
import { FOOD_TYPES } from '../core/foodTypes';
import type { Filters, LatLng } from '../core/types';
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

const DEFAULT_RADIUS_M = 1500;
const WALK_METERS_PER_MIN = 80;
const MAX_PAGES = 3;

const functions = () => getFunctions(app);

function radiusFor(f: Filters): number {
  if (f.radiusMeters) return f.radiusMeters;
  if (f.maxWalkMin) return f.maxWalkMin * WALK_METERS_PER_MIN;
  return DEFAULT_RADIUS_M;
}

function typesFor(cuisines: string[]): string[] {
  const out: string[] = [];
  for (const c of cuisines) {
    const t = FOOD_TYPES.find((x) => x.value === c)?.placesType;
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

export async function searchPlaces(filters: Filters): Promise<PlaceLite[]> {
  const call = httpsCallable<unknown, { places?: PlaceLite[]; nextPageToken?: string } | null>(
    functions(),
    'searchPlaces',
  );
  const request = {
    anchor: filters.anchor,
    radiusMeters: radiusFor(filters),
    includedTypes: typesFor(filters.cuisines),
    maxPrice: filters.maxPrice,
    minRating: filters.minRating,
    openNow: filters.openNow,
  };
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
