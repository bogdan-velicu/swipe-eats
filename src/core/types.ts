// Shared domain types. Type-only: no runtime code, no React / React Native imports.
import type { UnitSystem } from './units';

export interface LatLng {
  lat: number;
  lng: number;
}

export type SwipeDir = 'LIKE' | 'PASS';

export interface Participant {
  id: string;
  name: string;
  emoji: string;
  color: string;
  joinedAt: number;
  active: boolean;
}

export interface Candidate {
  id: string;
  kind: 'foodType' | 'place';
  placeId?: string;
  name: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  location?: LatLng;
  primaryType?: string;
  address?: string;
}

export interface Filters {
  unit: UnitSystem;
  maxWalkMin?: number;
  radiusMeters?: number;
  cuisines: string[];
  maxPrice?: string;
  minRating?: number;
  openNow: boolean;
  anchor: LatLng;
}

export interface Session {
  id: string;
  code: string;
  hostId: string;
  status: 'waiting' | 'active' | 'finished' | 'cancelled';
  mode: 'foodType' | 'place' | 'both';
  filters: Filters;
  participants: Record<string, Participant>;
  candidates: Candidate[];
  /** Logical shape: participantId -> candidateId -> direction. */
  swipes: Record<string, Record<string, SwipeDir>>;
}
