import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ensureAnonymousAuth } from '../src/backend/auth';
import { createSession } from '../src/backend/sessionService';
import type { LatLng, Session } from '../src/core/types';
import { randomBadge, type Badge } from '../src/features/join/badges';
import { currentLocation, geocodeAddress } from '../src/features/session/location';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !busy && name.trim().length > 0 && (source === 'gps' || address.trim().length > 0);

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
      // Filters are a placeholder here; the full FilterSheet (Task 14) edits them in the lobby.
      const session = await createSession({
        host: { name: name.trim(), emoji: badge.emoji, color: badge.color },
        mode,
        filters: { unit, cuisines: [], openNow: false, radiusMeters: 1500, anchor },
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

      <ErrorText>{error}</ErrorText>
      <Button title={busy ? 'Starting...' : 'Start session'} onPress={() => void submit()} disabled={!canSubmit} />
    </ScrollView>
  );
}
