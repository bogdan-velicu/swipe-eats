import { ScrollView, Share, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activeParticipantIds } from '../src/core/matching';
import type { Candidate, Session } from '../src/core/types';
import { mapsDirectionsUrl } from '../src/features/results/mapsLink';
import { PickCard } from '../src/features/results/PickCard';
import { useResults } from '../src/features/results/useResults';
import { useSession } from '../src/features/session/useSession';
import { useTheme } from '../src/theme';
import { Button } from '../src/ui/Form';

function shareText(picks: Candidate[]): string {
  const lines = picks.map((c) => (c.kind === 'place' ? `${c.name}: ${mapsDirectionsUrl(c)}` : c.name));
  return `Dinner plan:\n${lines.join('\n')}`;
}

function Message({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg, alignItems: 'center', justifyContent: 'center', padding: t.space.xl }}>
      <Text style={{ color: t.color.textDim, textAlign: 'center', fontSize: t.font.size.md }}>{text}</Text>
    </View>
  );
}

function Recap({ session }: { session: Session }) {
  const t = useTheme();
  const router = useRouter();
  const { matches, leaderboard, soloPicks } = useResults(session);
  const solo = activeParticipantIds(session).length <= 1;
  const picks = solo ? soloPicks : matches.length > 0 ? matches : leaderboard.slice(0, 3).map((e) => e.candidate);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.bg }}>
      <ScrollView contentContainerStyle={{ padding: t.space.xl, gap: t.space.md }}>
        <Text style={{ color: t.color.text, fontSize: t.font.size.xl, fontWeight: '800' }}>Session complete</Text>
        {picks.length === 0 ? (
          <Text style={{ color: t.color.textDim, fontSize: t.font.size.md }}>No picks this time.</Text>
        ) : (
          picks.map((c) => <PickCard key={c.id} candidate={c} />)
        )}
        {picks.length > 0 ? (
          <Button title="Share" onPress={() => void Share.share({ message: shareText(picks) }).catch(() => {})} />
        ) : null}
        <Button title="Done" secondary onPress={() => router.replace('/')} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function RecapScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session, loading, error } = useSession(typeof id === 'string' ? id : undefined);
  if (loading || !session) {
    return <Message text={error ? "Couldn't load this session." : loading ? 'Loading...' : 'Session not found.'} />;
  }
  return <Recap session={session} />;
}
