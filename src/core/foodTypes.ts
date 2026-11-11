export type FoodType = {
  value: string;
  label: string;
  /** Google Places (New) includedType / primaryType string. */
  placesType: string;
  emoji: string;
};

export const FOOD_TYPES: FoodType[] = [
  { value: 'pizza', label: 'Pizza', placesType: 'pizza_restaurant', emoji: '🍕' },
  { value: 'burger', label: 'Burgers', placesType: 'hamburger_restaurant', emoji: '🍔' },
  // No dedicated kebab type in Places; middle_eastern_restaurant is the closest.
  { value: 'kebab', label: 'Kebab', placesType: 'middle_eastern_restaurant', emoji: '🥙' },
  { value: 'sushi', label: 'Sushi', placesType: 'sushi_restaurant', emoji: '🍣' },
  { value: 'ramen', label: 'Ramen', placesType: 'ramen_restaurant', emoji: '🍜' },
  { value: 'chinese', label: 'Chinese', placesType: 'chinese_restaurant', emoji: '🥡' },
  { value: 'indian', label: 'Indian', placesType: 'indian_restaurant', emoji: '🍛' },
  { value: 'italian', label: 'Italian', placesType: 'italian_restaurant', emoji: '🍝' },
  { value: 'mexican', label: 'Mexican', placesType: 'mexican_restaurant', emoji: '🌮' },
  { value: 'thai', label: 'Thai', placesType: 'thai_restaurant', emoji: '🍲' },
  { value: 'mediterranean', label: 'Mediterranean', placesType: 'mediterranean_restaurant', emoji: '🫒' },
  { value: 'seafood', label: 'Seafood', placesType: 'seafood_restaurant', emoji: '🦐' },
  { value: 'steakhouse', label: 'Steakhouse', placesType: 'steak_house', emoji: '🥩' },
  { value: 'vegan', label: 'Vegan', placesType: 'vegan_restaurant', emoji: '🥗' },
  { value: 'cafe', label: 'Cafe', placesType: 'cafe', emoji: '☕' },
  { value: 'fast_food', label: 'Fast Food', placesType: 'fast_food_restaurant', emoji: '🍟' },
  { value: 'sandwiches', label: 'Sandwiches', placesType: 'sandwich_shop', emoji: '🥪' },
  { value: 'bbq', label: 'BBQ', placesType: 'barbecue_restaurant', emoji: '🍖' },
  { value: 'breakfast', label: 'Breakfast', placesType: 'breakfast_restaurant', emoji: '🥞' },
  { value: 'vietnamese', label: 'Vietnamese', placesType: 'vietnamese_restaurant', emoji: '🍚' },
  { value: 'korean', label: 'Korean', placesType: 'korean_restaurant', emoji: '🥘' },
  { value: 'japanese', label: 'Japanese', placesType: 'japanese_restaurant', emoji: '🍱' },
];

const LEVELS = [
  'PRICE_LEVEL_FREE',
  'PRICE_LEVEL_INEXPENSIVE',
  'PRICE_LEVEL_MODERATE',
  'PRICE_LEVEL_EXPENSIVE',
  'PRICE_LEVEL_VERY_EXPENSIVE',
];

/** Maps a Google price level to '' / '$' .. '$$$$'. Unknown levels -> ''. Optionally cap symbols at `max`. */
export function priceLevelToSymbols(level: string, max = 4): string {
  const n = LEVELS.indexOf(level);
  if (n <= 0) return '';
  return '$'.repeat(Math.min(n, max));
}

/** Inverse of priceLevelToSymbols. '' -> PRICE_LEVEL_FREE. */
export function symbolsToPriceLevel(s: string): string {
  return LEVELS[Math.min(s.length, 4)];
}
