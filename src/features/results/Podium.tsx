import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Candidate } from '../../core/types';
import { useTheme } from '../../theme';
import { HeroThumb } from './HeroThumb';
import { MEDALS } from './medals';
import type { LeaderboardEntry } from './useResults';

/** Per-place layout: center (1st) is tallest, flanked by 2nd (left) and 3rd (right). */
const SPEC = {
  0: { thumb: 108, pedestal: 76, order: 2 }, // gold — center
  1: { thumb: 86, pedestal: 54, order: 1 }, // silver — left
  2: { thumb: 86, pedestal: 40, order: 3 }, // bronze — right
} as const;

/**
 * The reveal: a 2-1-3 winners' podium for the top three places. Each plinth carries the
 * restaurant's photo, a medal rank badge, its name and like count. Tapping a place opens
 * its spotlight. A hairline baseline ties the three plinths into one leaderboard.
 */
export function Podium({ top, onPick }: { top: LeaderboardEntry[]; onPick: (c: Candidate) => void }) {
  const t = useTheme();
  const places = top.slice(0, 3);
  // Lay out as [2nd, 1st, 3rd]; keep original rank for tone + numeral.
  const ordered = places
    .map((entry, rank) => ({ entry, rank }))
    .sort((a, b) => SPEC[a.rank as 0 | 1 | 2].order - SPEC[b.rank as 0 | 1 | 2].order);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {ordered.map(({ entry, rank }) => {
          const spec = SPEC[rank as 0 | 1 | 2];
          const medal = MEDALS[rank];
          return (
            <Pressable
              key={entry.candidate.id}
              accessibilityRole="button"
              accessibilityLabel={`${entry.candidate.name}, number ${rank + 1}, ${entry.likes} likes`}
              onPress={() => onPick(entry.candidate)}
              style={styles.col}
            >
              <Text numberOfLines={1} style={[styles.name, { color: t.color.text }]}>
                {entry.candidate.name}
              </Text>
              <Text style={[styles.likes, { color: t.color.textDim }]}>
                {entry.likes} {entry.likes === 1 ? 'like' : 'likes'}
              </Text>
              <View style={[styles.thumbWrap, { width: spec.thumb, height: spec.thumb, borderColor: medal }]}>
                <HeroThumb candidate={entry.candidate} radius={t.radius.md - 3} />
                <View style={[styles.badge, { backgroundColor: medal }]}>
                  <Text style={styles.badgeText}>{rank + 1}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.plinth,
                  { height: spec.pedestal, backgroundColor: t.color.surface, borderTopColor: medal },
                ]}
              >
                <Text style={[styles.numeral, { color: medal }]}>{rank + 1}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.baseline, { backgroundColor: t.color.surfaceGlass }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10 },
  col: { flex: 1, maxWidth: 128, alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '700', textAlign: 'center', maxWidth: '100%' },
  likes: { fontSize: 12, marginTop: 2, marginBottom: 8 },
  thumbWrap: { borderRadius: 14, borderWidth: 2, padding: 1 },
  badge: {
    position: 'absolute',
    top: -10,
    left: -10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#0c0c10', fontSize: 15, fontWeight: '900' },
  plinth: {
    width: '100%',
    marginTop: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderTopWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeral: { fontSize: 34, fontWeight: '900', opacity: 0.22 },
  baseline: { height: 2, borderRadius: 2, marginTop: 0 },
});
