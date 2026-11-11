import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ensureAnonymousAuth } from '../src/backend/auth';
import { createSession } from '../src/backend/sessionService';
import type { LatLng, Session } from '../src/core/types';
import { randomBadge, type Badge } from '../src/features/join/badges';
import { currentLocation, geocodeAddress } from '../src/features/session/location';
import { DEFAULT_DRAFT, FilterSheet, type FilterDraft } from '../src/features/filters/FilterSheet';
import { foodTypeCandidates } from '../src/features/filters/placesRound';
import { RangeMap } from '../src/features/map/RangeMap';
import { useSettings } from '../src/state/settings';
import { useTheme } from '../src/theme';
import { BadgePicker, Button, ErrorText, Field, Label, Segmented } from '../src/ui/Form';

const MODES: { value: Session['mode']; label: string }[] = [
  { value: 'foodType', label: 'Food type' },
  { value: 'place', label: 'Place' },
  { value: 'both', label: 'Both' },
];
const LOCATION_SOURCES = [
  { value: 'gps', label: 'My location' },
  { value: 'address', label: 'Address' },
] as const;

export default function CreateScreen() {
  const t = useTheme();
  const router = useRouter();
  const { unit } = useSettings();
  const [name, setName] = useState('');
  const [badge, setBadge] = useState<Badge>(() => randomBadge());
  const [mode, setMode] = useState<Session['mode']>('both');
  const [source, setSource] = useState<'gps' | 'address'>('gps');
  const [address, setAddress] = useState('');
  const [draft, setDraft] = useState<FilterDraft>(DEFAULT_DRAFT);
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [previewAnchor, setPreviewAnchor] = useState<LatLng | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !busy && name.trim().length > 0 && (source === 'gps' || address.trim().length > 0);

  // Resolve the anchor for the range preview only while the map is open.
  useEffect(() => {
    if (!showMap) return;
    let alive = true;
    const timer = setTimeout(
      () => {
        const p = source === 'gps' ? currentLocation() : geocodeAddress(address);
        void p.then((r) => {
          if (alive) setPreviewAnchor(r.ok ? r.anchor : null);
        });
      },
      source === 'gps' ? 0 : 600,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [showMap, source, address]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const loc = source === 'gps' ? await currentLocation() : await geocodeAddress(address);
      if (!loc.ok) {
        setError(loc.error);
        return;
      }
      const anchor: LatLng = loc.anchor;
      await ensureAnonymousAuth();
      // Filters are immutable after create (rules), so they are chosen here. Food-type rounds are seeded
      // now; the place list is fetched by the host when they start / hand off (see lobby).
      const session = await createSession({
        host: { name: name.trim(), emoji: badge.emoji, color: badge.color },
        mode,
        filters: { ...draft, unit, anchor },
        candidates: mode === 'place' ? [] : foodTypeCandidates(),
      });
      router.replace({ pathname: '/lobby', params: { id: session.id } });
    } catch {
      setError("Couldn't start the session. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: t.color.bg }}
      contentContainerStyle={{ padding: t.space.xl, paddingBottom: t.space.xxxl }}
      keyboardShouldPersistTaps="handled"
    >
      <Label>Your name</Label>
      <Field value={name} onChangeText={setName} placeholder="Name" maxLength={24} autoCapitalize="words" />

      <Label>Your badge</Label>
      <BadgePicker value={badge} onChange={setBadge} />

      <Label>What are we deciding?</Label>
      <Segmented options={MODES} value={mode} onChange={setMode} />

      <Label>Where?</Label>
      <Segmented options={[...LOCATION_SOURCES]} value={source} onChange={setSource} />
      {source === 'address' ? (
        <Field
          style={{ marginTop: t.space.sm }}
          value={address}
          onChangeText={setAddress}
          placeholder="Street, city"
          autoCapitalize="words"
        />
      ) : (
        <Text style={{ color: t.color.textDim, marginTop: t.space.sm }}>We will use your current location.</Text>
      )}

      <Pressable accessibilityRole="button" onPress={() => setShowFilters((v) => !v)}>
        <Label>{showFilters ? 'Filters (tap to hide)' : 'Filters (tap to edit)'}</Label>
      </Pressable>
      {showFilters ? <FilterSheet value={draft} onChange={setDraft} /> : null}

      <Pressable accessibilityRole="button" onPress={() => setShowMap((v) => !v)}>
        <Label>{showMap ? 'Reachable range (tap to hide)' : 'Reachable range (tap to preview map)'}</Label>
      </Pressable>
      {showMap ? (
        previewAnchor ? (
          <RangeMap filters={{ ...draft, anchor: previewAnchor }} />
        ) : (
          <Text style={{ color: t.color.textDim }}>Set a location to preview your range.</Text>
        )
      ) : null}

      <ErrorText>{error}</ErrorText>
      <Button title={busy ? 'Starting...' : 'Start session'} onPress={() => void submit()} disabled={!canSubmit} />
    </ScrollView>
  );
}
