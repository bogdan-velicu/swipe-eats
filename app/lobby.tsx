import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ensureAnonymousAuth } from '../src/backend/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { searchPlaces } from '../src/backend/placesClient';
import { cancelSession, leaveSession, setCandidates, startPlacesRound, startSession } from '../src/backend/sessionService';
import { FOOD_TYPES } from '../src/core/foodTypes';
import type { Session } from '../src/core/types';
import { buildPlacesQuery } from '../src/features/filters/buildPlacesQuery';
import { placesToCandidates, winningCuisines } from '../src/features/filters/placesRound';
import { ShareCard } from '../src/features/join/ShareCard';
import { useSession } from '../src/features/session/useSession';
import { useTheme } from '../src/theme';
import { Button, ErrorText } from '../src/ui/Form';

function Centered({ text, children }: { text: string; children?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg, alignItems: 'center', justifyContent: 'center', padding: t.space.xl }}>
      <Text style={{ color: t.color.textDim, textAlign: 'center', fontSize: t.font.size.md }}>{text}</Text>
      {children}
    </View>
  );
}

/**
 * Live lobby. All data comes from observeSession (we are a participant by now), never the pre-join stub.
 * Filters are immutable once created (rules), so they are chosen on the create screen.
 */
export default function LobbyScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const sid = typeof id === 'string' ? id : undefined;
  const { session, loading, error, retry } = useSession(sid);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    void ensureAnonymousAuth().then(setUid, () => {});
  }, []);

  // Everyone jumps to the deck when the host starts (waiting -> active). Later mode changes
  // (food type -> places) are handled by the already-mounted swipe screen, not by re-navigating.
  const prevStatus = useRef<Session['status'] | null>(null);
  useEffect(() => {
    if (!session) return;
    if (prevStatus.current === 'waiting' && session.status === 'active') {
      router.push({ pathname: '/swipe', params: { id: session.id } });
    }
    prevStatus.current = session.status;
  }, [session, router]);

  const goHome = () => router.replace('/');

  if (loading) return <Centered text="Loading..." />;
  if (error) {
    return (
      <Centered text="Connection lost. Check your network and try again.">
        <View style={{ alignSelf: 'stretch', marginTop: t.space.lg }}>
          <Button title="Retry" onPress={retry} />
          <Button title="Back" secondary onPress={goHome} />
        </View>
      </Centered>
    );
  }
  if (!session) {
    return (
      <Centered text="Session not found.">
        <View style={{ alignSelf: 'stretch', marginTop: t.space.lg }}>
          <Button title="Back" secondary onPress={goHome} />
        </View>
      </Centered>
    );
  }

  const isHost = !!uid && session.hostId === uid;
  const people = Object.values(session.participants).filter((p) => p.active);
  const waiting = session.status === 'waiting';
  const active = session.status === 'active';
  const ended = session.status === 'finished' || session.status === 'cancelled';
  const canFindPlaces = isHost && active && session.mode !== 'place';

  async function run(fn: () => Promise<void>, failMsg: string) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch {
      setActionError(failMsg);
    } finally {
      setBusy(false);
    }
  }

  const start = () =>
    run(async () => {
      if (session.mode === 'place') {
        // Place-only: fetch the deck now. Empty results are fine; the deck shows its empty state.
        await setCandidates(session.id, placesToCandidates(await searchPlaces(buildPlacesQuery(session.filters))));
      }
      await startSession(session.id);
    }, "Couldn't start. Check your connection and try again.");

  // Food-type -> places handoff: host taps once the cuisine round has run (never automatic).
  const findPlaces = () =>
    run(async () => {
      const winners = winningCuisines(session);
      const filters = { ...session.filters, cuisines: winners.length > 0 ? winners : session.filters.cuisines };
      await setCandidates(session.id, placesToCandidates(await searchPlaces(buildPlacesQuery(filters))));
      await startPlacesRound(session.id);
    }, "Couldn't find places. Check your connection and try again.");

  const cancel = () =>
    run(async () => {
      await cancelSession(session.id);
      goHome();
    }, "Couldn't cancel the session.");

  const leave = () =>
    run(async () => {
      await leaveSession(session.id);
      goHome();
    }, "Couldn't leave the session.");

  const winners = winningCuisines(session).map((v) => FOOD_TYPES.find((f) => f.value === v)?.label ?? v);

  return (
    <ScrollView style={{ backgroundColor: t.color.bg }} contentContainerStyle={{ padding: t.space.xl, paddingBottom: t.space.xxxl }}>
      <ShareCard code={session.code} />
      <Text style={{ color: t.color.textDim, marginTop: t.space.xl, marginBottom: t.space.sm }}>
        {people.length} in the lobby
      </Text>
      {people.map((p) => (
        <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: t.space.sm }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: p.color, alignItems: 'center', justifyContent: 'center', marginRight: t.space.md }}>
            <Text style={{ fontSize: 18 }}>{p.emoji}</Text>
          </View>
          <Text style={{ color: t.color.text, fontSize: t.font.size.md, flex: 1 }}>
            {p.name}
            {p.id === session.hostId ? ' (host)' : ''}
            {p.id === uid ? ' (you)' : ''}
          </Text>
          <Text style={{ color: t.color.like, fontSize: t.font.size.sm }}>Ready</Text>
        </View>
      ))}

      {ended ? <Text style={{ color: t.color.textDim, marginTop: t.space.lg }}>This session has ended.</Text> : null}
      {waiting && !isHost ? (
        <Text style={{ color: t.color.textDim, marginTop: t.space.lg }}>Waiting for the host to start...</Text>
      ) : null}

      {waiting && isHost ? <Button title={busy ? 'Starting...' : 'Start swiping'} onPress={() => void start()} disabled={busy} /> : null}
      {active ? (
        <Button
          title="Back to swiping"
          secondary={canFindPlaces}
          onPress={() => router.push({ pathname: '/swipe', params: { id: session.id } })}
        />
      ) : null}
      {canFindPlaces ? (
        <>
          {winners.length > 0 ? (
            <Text style={{ color: t.color.textDim, marginTop: t.space.md }}>Leading: {winners.join(', ')}</Text>
          ) : null}
          <Button title={busy ? 'Searching...' : 'Find places'} onPress={() => void findPlaces()} disabled={busy} />
        </>
      ) : null}
      {isHost && !ended ? <Button title="Cancel session" secondary onPress={() => void cancel()} disabled={busy} /> : null}
      {!isHost && !ended ? <Button title="Leave" secondary onPress={() => void leave()} disabled={busy} /> : null}
      <ErrorText>{actionError}</ErrorText>
    </ScrollView>
  );
}
