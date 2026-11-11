import { StyleSheet, Text, View } from 'react-native';
import type { Candidate, LatLng } from '../../core/types';
import { PlacePhotos } from '../place/PlacePhotos';
import { PlaceReviews } from '../place/PlaceReviews';
import { distanceLabel } from '../place/distanceLabel';
import { usePlaceDetail } from '../place/use-place-detail';
import { useSettings } from '../../state/settings';
import { useTheme } from '../../theme';

const PRICE_SYMBOLS: Record<string, string> = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
};

/**
 * Photos and reviews are fetched fresh when the card mounts (Google Places ToS:
 * no persistence). `anchor` is the session's search anchor for distance/walk time.
 */
export function SwipeCard({ candidate, anchor }: { candidate: Candidate; anchor?: LatLng }) {
  const t = useTheme();
  const { unit } = useSettings();
  const { photos, reviews } = usePlaceDetail(candidate.placeId);
  const distance = distanceLabel(anchor, candidate.location, unit);

  const meta: string[] = [];
  if (candidate.rating != null) {
    const count = candidate.userRatingCount != null ? ` (${candidate.userRatingCount})` : '';
    meta.push(`★ ${candidate.rating.toFixed(1)}${count}`);
  }
  if (candidate.priceLevel) meta.push(PRICE_SYMBOLS[candidate.priceLevel] ?? candidate.priceLevel);
  if (candidate.primaryType) meta.push(candidate.primaryType.replace(/_/g, ' '));

  return (
    <View style={[styles.card, { backgroundColor: t.color.surface, borderRadius: t.radius.lg }]}>
      <View style={styles.photo}>
        <PlacePhotos photos={photos} fallbackEmoji={candidate.kind === 'place' ? '🍽️' : '🍜'} />
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
        {distance ? (
          <Text style={{ color: t.color.textDim, fontSize: t.font.size.sm, marginTop: t.space.xs }}>{distance}</Text>
        ) : null}
        {candidate.address ? (
          <Text numberOfLines={1} style={{ color: t.color.textDim, fontSize: t.font.size.sm, marginTop: t.space.xs }}>
            {candidate.address}
          </Text>
        ) : null}
        {reviews.length > 0 && (
          <View style={{ marginTop: t.space.md }}>
            <PlaceReviews reviews={reviews} max={1} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, overflow: 'hidden' },
  photo: { flex: 1 },
});
