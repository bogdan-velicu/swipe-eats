import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ShareCard } from '../src/features/join/ShareCard';
import { useSession } from '../src/features/session/useSession';
import { useTheme } from '../src/theme';

/**
 * Minimal lobby (full lobby lands in a later task): share card + live participant list.
 * All data comes from observeSession (we are a participant by now) - never from the pre-join stub.
 */
export default function LobbyScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session, loading, error } = useSession(typeof id === 'string' ? id : undefined);

  if (loading || !session) {
    return (
      <View style={{ flex: 1, backgroundColor: t.color.bg, alignItems: 'center', justifyContent: 'center', padding: t.space.xl }}>
        <Text style={{ color: t.color.textDim, textAlign: 'center' }}>
          {error ? "Couldn't load this session." : loading ? 'Loading...' : 'Session not found.'}
        </Text>
      </View>
    );
  }

  const people = Object.values(session.participants).filter((p) => p.active);
  return (
    <ScrollView style={{ backgroundColor: t.color.bg }} contentContainerStyle={{ padding: t.space.xl }}>
      <ShareCard code={session.code} />
      <Text style={{ color: t.color.textDim, marginTop: t.space.xl, marginBottom: t.space.sm }}>
        {people.length} in the lobby
      </Text>
      {people.map((p) => (
        <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: t.space.sm }}>
          <View
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: p.color, alignItems: 'center', justifyContent: 'center', marginRight: t.space.md }}
          >
            <Text style={{ fontSize: 18 }}>{p.emoji}</Text>
          </View>
          <Text style={{ color: t.color.text, fontSize: t.font.size.md }}>
            {p.name}
            {p.id === session.hostId ? ' (host)' : ''}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
