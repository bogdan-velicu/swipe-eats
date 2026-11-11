import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ensureAnonymousAuth } from '../src/backend/auth';
import { useSession } from '../src/features/session/useSession';
import { SwipeDeck } from '../src/features/swipe/SwipeDeck';
import { useDeck } from '../src/features/swipe/useDeck';
import type { Session } from '../src/core/types';
import { useTheme } from '../src/theme';
import { Button } from '../src/ui/Form';

function Message({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg, alignItems: 'center', justifyContent: 'center', padding: t.space.xl }}>
      <Text style={{ color: t.color.textDim, textAlign: 'center', fontSize: t.font.size.md }}>{text}</Text>
    </View>
  );
}

function Deck({ session, uid }: { session: Session; uid: string }) {
  const t = useTheme();
  const router = useRouter();
  // Rehydrate: skip what this user already swiped so a remount never restarts at card 0.
  const deck = useDeck(session, Object.keys(session.swipes?.[uid] ?? {}));
  const toResults = () => router.push({ pathname: '/results', params: { id: session.id } });

  // Deck emptied *during* this mount -> reveal results (not on a bare mount, so Back works).
  const wasEmpty = useRef(deck.empty);
  useEffect(() => {
    if (!wasEmpty.current && deck.empty) toResults();
    wasEmpty.current = deck.empty;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.empty]);

  if (deck.empty) {
    if (session.candidates.length === 0) {
      return <Message text="No places to swipe yet. Try widening the search radius or loosening your filters." />;
    }
    return (
      <View style={{ flex: 1, backgroundColor: t.color.bg, justifyContent: 'center', padding: t.space.xl }}>
        <Text style={{ color: t.color.textDim, textAlign: 'center', fontSize: t.font.size.md }}>
          You have swiped everything.
        </Text>
        <Button title="See results" onPress={toResults} />
      </View>
    );
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.color.bg }}>
      <SwipeDeck deck={deck} anchor={session.filters?.anchor} />
    </SafeAreaView>
  );
}

export default function SwipeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session, loading, error } = useSession(typeof id === 'string' ? id : undefined);
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    void ensureAnonymousAuth().then(setUid, () => {});
  }, []);
  if (!loading && session && uid) {
    // key by mode: the food-type -> places handoff swaps the candidate list, so reset the deck.
    return <Deck key={session.mode} session={session} uid={uid} />;
  }
  return <Message text={error ? "Couldn't load this session." : !loading && !session ? 'Session not found.' : 'Loading...'} />;
}
