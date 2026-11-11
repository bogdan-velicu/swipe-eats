import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../src/features/session/useSession';
import { SwipeDeck } from '../src/features/swipe/SwipeDeck';
import { useDeck } from '../src/features/swipe/useDeck';
import type { Session } from '../src/core/types';
import { useTheme } from '../src/theme';

function Message({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg, alignItems: 'center', justifyContent: 'center', padding: t.space.xl }}>
      <Text style={{ color: t.color.textDim, textAlign: 'center', fontSize: t.font.size.md }}>{text}</Text>
    </View>
  );
}

function Deck({ session }: { session: Session }) {
  const t = useTheme();
  const deck = useDeck(session);
  if (deck.empty) {
    return (
      <Message
        text={
          session.candidates.length === 0
            ? 'No places to swipe yet. Try widening the search radius or loosening your filters.'
            : "You've swiped everything. Waiting on the others for a match."
        }
      />
    );
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.bg }}>
      <SwipeDeck deck={deck} />
    </SafeAreaView>
  );
}

export default function SwipeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session, loading, error } = useSession(typeof id === 'string' ? id : undefined);
  if (loading || !session) {
    return <Message text={error ? "Couldn't load this session." : loading ? 'Loading...' : 'Session not found.'} />;
  }
  return <Deck session={session} />;
}
