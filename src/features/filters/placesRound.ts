// Pure helpers for the food-type -> places handoff.
import { FOOD_TYPES } from '../../core/foodTypes';
import { leaderboard, matches } from '../../core/matching';
import type { Candidate, Session } from '../../core/types';
import type { PlaceLite } from '../../backend/placesClient';

export const MAX_CUISINES = 3;

/** Cuisines that won the food-type round: unanimous matches, else the most-liked; max 3. */
export function winningCuisines(s: Session): string[] {
  const valid = new Set(FOOD_TYPES.map((f) => f.value));
  const unanimous = matches(s).filter((id) => valid.has(id));
  const pool = unanimous.length > 0 ? unanimous : leaderboard(s).map((l) => l.candidateId).filter((id) => valid.has(id));
  return pool.slice(0, MAX_CUISINES);
}

export function placesToCandidates(places: PlaceLite[]): Candidate[] {
  return places.map((p) => ({
    id: p.id,
    kind: 'place',
    placeId: p.id,
    name: p.name,
    rating: p.rating,
    userRatingCount: p.userRatingCount,
    priceLevel: p.priceLevel,
    location: p.location,
    primaryType: p.primaryType,
    address: p.address,
  }));
}

export function foodTypeCandidates(): Candidate[] {
  return FOOD_TYPES.map((f) => ({ id: f.value, kind: 'foodType', name: `${f.emoji} ${f.label}`, primaryType: f.placesType }));
}
