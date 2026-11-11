// Shared domain types. Type-only: no runtime code, no React / React Native imports.
import type { UnitSystem } from './units';

export interface LatLng {
  lat: number;
  lng: number;
}

/** LIKE / PASS decide matches + ranking; MAYBE is a neutral "unsure" — recorded but it
 * counts 0 toward the leaderboard and never creates a match. */
export type SwipeDir = 'LIKE' | 'PASS' | 'MAYBE';

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
  /** Hero emoji for food-type cards (places use photos). */
  emoji?: string;
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
