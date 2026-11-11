import { Pressable, Switch, Text, View } from 'react-native';
import { FOOD_TYPES, priceLevelToSymbols, symbolsToPriceLevel } from '../../core/foodTypes';
import type { Filters } from '../../core/types';
import { formatDistance, type UnitSystem } from '../../core/units';
import { useSettings } from '../../state/settings';
import { useTheme } from '../../theme';
import { Label, Segmented } from '../../ui/Form';
import { MAX_CUISINES } from './placesRound';

/** Filters minus the parts the host does not edit here (anchor comes from location; unit from settings). */
export type FilterDraft = Omit<Filters, 'anchor' | 'unit'>;

export const DEFAULT_DRAFT: FilterDraft = { maxWalkMin: 15, cuisines: [], openNow: false };

const WALK_OPTIONS = [5, 10, 15, 20, 30];
const RADIUS_METERS: Record<UnitSystem, number[]> = {
  metric: [500, 1000, 2000, 5000],
  imperial: [402, 805, 1609, 4828], // 0.25 / 0.5 / 1 / 3 mi
};
const RATINGS = [undefined, 3.5, 4, 4.5];
const PRICES = ['$', '$$', '$$$', '$$$$'];

function Chip({ label, active, onPress, disabled }: { label: string; active: boolean; onPress: () => void; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        paddingHorizontal: t.space.lg,
        paddingVertical: t.space.sm,
        borderRadius: t.radius.pill,
        backgroundColor: active ? t.color.accent : t.color.surface,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ color: active ? t.color.bg : t.color.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const Row = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
);

/**
 * Controlled filter editor. The unit toggle drives the per-viewer `useSettings().unit` (display only);
 * `Filters.unit` stays the host's create-time context.
 */
export function FilterSheet({ value, onChange }: { value: FilterDraft; onChange: (v: FilterDraft) => void }) {
  const t = useTheme();
  const { unit, setUnit } = useSettings();
  const byRadius = value.radiusMeters !== undefined;
  const set = (patch: Partial<FilterDraft>) => onChange({ ...value, ...patch });
  const price = value.maxPrice ? priceLevelToSymbols(value.maxPrice) : '';

  function toggleCuisine(c: string) {
    const has = value.cuisines.includes(c);
    if (!has && value.cuisines.length >= MAX_CUISINES) return;
    set({ cuisines: has ? value.cuisines.filter((x) => x !== c) : [...value.cuisines, c] });
  }

  return (
    <View>
      <Label>Units</Label>
      <Segmented
        options={[{ value: 'metric', label: 'km' }, { value: 'imperial', label: 'miles' }]}
        value={unit}
        onChange={(u) => void setUnit(u)}
      />

      <Label>How far?</Label>
      <Segmented
        options={[{ value: 'walk', label: 'Walking time' }, { value: 'radius', label: 'Distance' }]}
        value={byRadius ? 'radius' : 'walk'}
        onChange={(m) =>
          m === 'walk'
            ? onChange({ ...value, radiusMeters: undefined, maxWalkMin: value.maxWalkMin ?? 15 })
            : onChange({ ...value, maxWalkMin: undefined, radiusMeters: value.radiusMeters ?? RADIUS_METERS[unit][2] })
        }
      />
      <View style={{ marginTop: t.space.sm }}>
        <Row>
          {byRadius
            ? RADIUS_METERS[unit].map((m) => (
                <Chip key={m} label={formatDistance(m, unit)} active={value.radiusMeters === m} onPress={() => set({ radiusMeters: m })} />
              ))
            : WALK_OPTIONS.map((m) => (
                <Chip key={m} label={`${m} min`} active={value.maxWalkMin === m} onPress={() => set({ maxWalkMin: m })} />
              ))}
        </Row>
      </View>

      <Label>{`Cuisine (up to ${MAX_CUISINES})`}</Label>
      <Row>
        {FOOD_TYPES.map((f) => {
          const active = value.cuisines.includes(f.value);
          return (
            <Chip
              key={f.value}
              label={`${f.emoji} ${f.label}`}
              active={active}
              disabled={!active && value.cuisines.length >= MAX_CUISINES}
              onPress={() => toggleCuisine(f.value)}
            />
          );
        })}
      </Row>

      <Label>Max price</Label>
      <Row>
        <Chip label="Any" active={!value.maxPrice} onPress={() => set({ maxPrice: undefined })} />
        {PRICES.map((p) => (
          <Chip key={p} label={p} active={price === p} onPress={() => set({ maxPrice: symbolsToPriceLevel(p) })} />
        ))}
      </Row>

      <Label>Minimum rating</Label>
      <Row>
        {RATINGS.map((r) => (
          <Chip key={String(r)} label={r === undefined ? 'Any' : `${r}+`} active={value.minRating === r} onPress={() => set({ minRating: r })} />
        ))}
      </Row>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: t.space.xl }}>
        <Text style={{ color: t.color.text, fontSize: t.font.size.md }}>Open now</Text>
        <Switch value={value.openNow} onValueChange={(openNow) => set({ openNow })} trackColor={{ true: t.color.accent }} />
      </View>
    </View>
  );
}
