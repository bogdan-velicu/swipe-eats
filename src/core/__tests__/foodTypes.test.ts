import {
  FOOD_TYPES,
  priceLevelToSymbols,
  symbolsToPriceLevel,
} from '../foodTypes';

describe('FOOD_TYPES', () => {
  it('contains the curated set', () => {
    const values = FOOD_TYPES.map((f) => f.value);
    for (const v of [
      'pizza', 'burger', 'kebab', 'sushi', 'ramen', 'chinese', 'indian',
      'italian', 'mexican', 'thai', 'mediterranean', 'seafood', 'steakhouse',
      'vegan', 'cafe', 'fast_food', 'sandwiches', 'bbq', 'breakfast',
      'vietnamese', 'korean', 'japanese',
    ]) {
      expect(values).toContain(v);
    }
  });

  it('has non-empty fields on every entry', () => {
    for (const f of FOOD_TYPES) {
      expect(f.placesType.length).toBeGreaterThan(0);
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.emoji.length).toBeGreaterThan(0);
    }
  });

  it('has unique values', () => {
    const values = FOOD_TYPES.map((f) => f.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('price mapping', () => {
  it('maps levels to symbols', () => {
    expect(priceLevelToSymbols('PRICE_LEVEL_FREE')).toBe('');
    expect(priceLevelToSymbols('PRICE_LEVEL_INEXPENSIVE')).toBe('$');
    expect(priceLevelToSymbols('PRICE_LEVEL_MODERATE')).toBe('$$');
    expect(priceLevelToSymbols('PRICE_LEVEL_EXPENSIVE')).toBe('$$$');
    expect(priceLevelToSymbols('PRICE_LEVEL_VERY_EXPENSIVE')).toBe('$$$$');
  });

  it('returns empty for unknown levels', () => {
    expect(priceLevelToSymbols('PRICE_LEVEL_UNSPECIFIED')).toBe('');
    expect(priceLevelToSymbols('garbage')).toBe('');
  });

  it('round-trips', () => {
    expect(symbolsToPriceLevel('$$')).toBe('PRICE_LEVEL_MODERATE');
    for (const l of [
      'PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE',
      'PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE',
    ]) {
      expect(symbolsToPriceLevel(priceLevelToSymbols(l))).toBe(l);
    }
  });

  it('caps symbols at max', () => {
    expect(priceLevelToSymbols('PRICE_LEVEL_VERY_EXPENSIVE', 3)).toBe('$$$');
    expect(priceLevelToSymbols('PRICE_LEVEL_MODERATE', 3)).toBe('$$');
  });
});
