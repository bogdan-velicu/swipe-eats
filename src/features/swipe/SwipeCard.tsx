import { Image, StyleSheet, Text, View } from 'react-native';
import type { Candidate } from '../../core/types';
import { useTheme } from '../../theme';

/** Candidate has no photo field yet (gallery lands in Task 13); an optional uri can be passed. */
export function SwipeCard({ candidate, photoUri }: { candidate: Candidate; photoUri?: string }) {
  const t = useTheme();
  const meta: string[] = [];
  if (candidate.rating != null) {
    const count = candidate.userRatingCount != null ? ` (${candidate.userRatingCount})` : '';
    meta.push(`★ ${candidate.rating.toFixed(1)}${count}`);
  }
  if (candidate.priceLevel) meta.push(candidate.priceLevel);
  if (candidate.primaryType) meta.push(candidate.primaryType.replace(/_/g, ' '));

  return (
    <View style={[styles.card, { backgroundColor: t.color.surface, borderRadius: t.radius.lg }]}>
      <View style={[styles.photo, { backgroundColor: t.color.surfaceGlass }]}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>{candidate.kind === 'place' ? '🍽️' : '🍜'}</Text>
        )}
      </View>
      <View style={{ padding: t.space.xl }}>
        <Text numberOfLines={2} style={{ color: t.color.text, fontSize: t.font.size.xl, fontWeight: '700' }}>
          {candidate.name}
        </Text>
        {meta.length > 0 && (
          <Text style={{ color: t.color.textDim, fontSize: t.font.size.md, marginTop: t.space.sm }}>
            {meta.join('  ·  ')}
          </Text>
        )}
        {candidate.address ? (
          <Text numberOfLines={1} style={{ color: t.color.textDim, fontSize: t.font.size.sm, marginTop: t.space.xs }}>
            {candidate.address}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, overflow: 'hidden' },
  photo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 96 },
});
