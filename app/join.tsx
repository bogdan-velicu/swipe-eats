import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ensureAnonymousAuth } from '../src/backend/auth';
import { joinSession } from '../src/backend/sessionService';
import { randomBadge, type Badge } from '../src/features/join/badges';
import { resolveJoinCode, joinErrorMessage } from '../src/features/join/joinFlow';
import { QrScanner } from '../src/features/join/QrScanner';
import { normalizeCode, parseJoinLink } from '../src/features/join/useDeepLink';
import { useTheme } from '../src/theme';
import { BadgePicker, Button, ErrorText, Field, Label } from '../src/ui/Form';

export default function JoinScreen() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [badge, setBadge] = useState<Badge>(() => randomBadge());
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deep link (swipeeats://join?code=...) lands here with ?code= -> prefill.
  const linked = typeof params.code === 'string' ? parseJoinLink(params.code) : null;
  useEffect(() => {
    if (linked) setCode(linked);
  }, [linked]);

  async function join(c: string = code) {
    if (!name.trim()) {
      setError('Enter your name to join.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await resolveJoinCode(c);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      await ensureAnonymousAuth();
      await joinSession(r.sessionId, {
        name: name.trim(),
        emoji: badge.emoji,
        color: badge.color,
        joinedAt: Date.now(),
        active: true,
      });
      router.replace({ pathname: '/lobby', params: { id: r.sessionId } });
    } catch (e) {
      setError(joinErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (scanning) {
    return (
      <QrScanner
        onClose={() => setScanning(false)}
        onCode={(scanned) => {
          setScanning(false);
          setCode(scanned);
          if (name.trim()) void join(scanned);
          else setError('Code scanned. Enter your name to join.');
        }}
      />
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: t.color.bg }}
      contentContainerStyle={{ padding: t.space.xl, paddingBottom: t.space.xxxl }}
      keyboardShouldPersistTaps="handled"
    >
      <Label>Session code</Label>
      <Field
        value={code}
        onChangeText={(v) => setCode(v.toUpperCase())}
        placeholder="ABC234"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        style={{ letterSpacing: 4, fontWeight: '700' }}
      />
      <Button title="Scan QR code" secondary onPress={() => setScanning(true)} />

      <Label>Your name</Label>
      <Field value={name} onChangeText={setName} placeholder="Name" maxLength={24} autoCapitalize="words" />

      <Label>Your badge</Label>
      <BadgePicker value={badge} onChange={setBadge} />

      <ErrorText>{error}</ErrorText>
      <Button
        title={busy ? 'Joining...' : 'Join session'}
        onPress={() => void join()}
        disabled={busy || !normalizeCode(code) || !name.trim()}
      />
    </ScrollView>
  );
}
