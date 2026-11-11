import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ensureAnonymousAuth } from '../src/backend/auth';
import { endSession } from '../src/backend/sessionService';
import { activeParticipantIds } from '../src/core/matching';
import type { Candidate, Session } from '../src/core/types';
import { PickCard } from '../src/features/results/PickCard';
import { Podium } from '../src/features/results/Podium';
import { RankBars } from '../src/features/results/RankBars';
import { Spotlight } from '../src/features/results/Spotlight';
import { useResults } from '../src/features/results/useResults';
import { useSession } from '../src/features/session/useSession';
import { useTheme } from '../src/theme';
import { Button } from '../src/ui/Form';

function Heading({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={{ color: t.color.text, fontSize: t.font.size.xl, fontWeight: '800', marginTop: t.space.lg }}>{children}</Text>;
}

function Message({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg, alignItems: 'center', justifyContent: 'center', padding: t.space.xl }}>
      <Text style={{ color: t.color.textDim, textAlign: 'center', fontSize: t.font.size.md }}>{text}</Text>
    </View>
  );
}

function Results({ session }: { session: Session }) {
  const t = useTheme();
  const router = useRouter();
  const { matches, leaderboard, soloPicks } = useResults(session);
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [spotlight, setSpotlight] = useState<Candidate | null>(null);
  useEffect(() => {
    void ensureAnonymousAuth().then(setUid, () => {});
  }, []);

  const solo = activeParticipantIds(session).length <= 1;
  const isHost = !!uid && session.hostId === uid;
  const recap = () => router.replace({ pathname: '/recap', params: { id: session.id } });

  // Everyone follows the host to the recap once the session is finished.
  useEffect(() => {
    if (session.status === 'finished') router.replace({ pathname: '/recap', params: { id: session.id } });
  }, [session.status, session.id, router]);

  const keepSwiping = () =>
    router.canGoBack() ? router.back() : router.replace({ pathname: '/swipe', params: { id: session.id } });
  const end = async () => {
    setBusy(true);
    try {
      await endSession(session.id);
      recap();
    } catch {
      setBusy(false);
    }
  };

  const empty = solo ? soloPicks.length === 0 : leaderboard.length === 0;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.bg }}>
      <ScrollView contentContainerStyle={{ padding: t.space.xl, gap: t.space.md }}>
        {empty ? (
          <Text style={{ color: t.color.textDim, fontSize: t.font.size.md, marginTop: t.space.xl }}>No picks yet. Keep swiping.</Text>
        ) : solo ? (
          <>
            <Heading>Your shortlist</Heading>
            {soloPicks.map((c) => (
              <PickCard key={c.id} candidate={c} />
            ))}
          </>
        ) : (
          <>
            {matches.length > 0 ? (
              <>
                <Heading>Everyone agreed</Heading>
                {matches.map((c) => (
                  <PickCard key={c.id} candidate={c} tag="Match" />
                ))}
              </>
            ) : null}
            <Heading>The results are in</Heading>
            <Podium top={leaderboard} onPick={setSpotlight} />
            {leaderboard.length > 3 ? (
              <View style={{ marginTop: t.space.md, gap: t.space.md }}>
                <RankBars
                  entries={leaderboard.slice(3)}
                  startRank={3}
                  maxLikes={leaderboard[0]?.likes ?? 0}
                  onPick={setSpotlight}
                />
              </View>
            ) : null}
          </>
        )}
        <Button title="Keep swiping" secondary onPress={keepSwiping} />
        {isHost ? <Button title={busy ? 'Ending...' : 'End session'} onPress={() => void end()} disabled={busy} /> : null}
        {!isHost && solo ? <Button title="Finish" onPress={recap} /> : null}
      </ScrollView>
      <Spotlight candidate={spotlight} onClose={() => setSpotlight(null)} />
    </SafeAreaView>
  );
}

export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session, loading, error } = useSession(typeof id === 'string' ? id : undefined);
  if (loading || !session) {
    return <Message text={error ? "Couldn't load this session." : loading ? 'Loading...' : 'Session not found.'} />;
  }
  return <Results session={session} />;
}
