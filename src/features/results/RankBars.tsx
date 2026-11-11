import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Candidate } from '../../core/types';
import { useTheme } from '../../theme';
import type { LeaderboardEntry } from './useResults';

/**
 * The runners-up as a ranked bar chart: each row is a line whose fill is the place's
 * share of the top score, so you read the gap at a glance. `startRank` is the 0-based
 * rank of the first row (4 when the podium took the top three). Tapping opens the spotlight.
 */
export function RankBars({
  entries,
  startRank,
  maxLikes,
  onPick,
}: {
  entries: LeaderboardEntry[];
  startRank: number;
  maxLikes: number;
  onPick: (c: Candidate) => void;
}) {
  const t = useTheme();
  if (entries.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      {entries.map((entry, i) => {
        const rank = startRank + i + 1; // 1-based for display
        const frac = maxLikes > 0 ? Math.max(0.06, entry.likes / maxLikes) : 0.06;
        return (
          <Pressable
            key={entry.candidate.id}
            accessibilityRole="button"
            accessibilityLabel={`${entry.candidate.name}, number ${rank}, ${entry.likes} likes`}
            onPress={() => onPick(entry.candidate)}
            style={[styles.row, { backgroundColor: t.color.surface }]}
          >
            <Text style={[styles.rank, { color: t.color.textDim }]}>{rank}</Text>
            <View style={styles.body}>
              <View style={styles.head}>
                <Text numberOfLines={1} style={[styles.name, { color: t.color.text }]}>
                  {entry.candidate.name}
                </Text>
                <Text style={[styles.likes, { color: t.color.textDim }]}>{entry.likes}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: t.color.surfaceGlass }]}>
                <View style={[styles.fill, { width: `${frac * 100}%`, backgroundColor: t.color.accent }]} />
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  rank: { width: 20, textAlign: 'center', fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  body: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  name: { flex: 1, fontSize: 15, fontWeight: '700', marginRight: 8 },
  likes: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
