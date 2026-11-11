import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import type { Candidate } from '../../core/types';
import { useTheme } from '../../theme';
import { PlacePhotos } from '../place/PlacePhotos';
import { PlaceReviews } from '../place/PlaceReviews';
import { usePlaceDetail } from '../place/use-place-detail';
import { mapsDirectionsUrl } from './mapsLink';

function Detail({ candidate }: { candidate: Candidate }) {
  const t = useTheme();
  const { photos, reviews, loading } = usePlaceDetail(candidate.placeId);
  return (
    <View style={{ gap: t.space.md, marginTop: t.space.md }}>
      {candidate.placeId ? (
        <View style={{ height: 180, borderRadius: t.radius.md, overflow: 'hidden' }}>
          <PlacePhotos photos={photos} />
        </View>
      ) : null}
      {loading ? <ActivityIndicator color={t.color.accent} /> : <PlaceReviews reviews={reviews} max={3} />}
    </View>
  );
}

/** A result row. Tap to reveal photos/reviews (fetched fresh, never stored) and a Directions action. */
export function PickCard({ candidate, tag }: { candidate: Candidate; tag?: string }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const isPlace = candidate.kind === 'place';
  const meta = [candidate.rating != null ? `${candidate.rating.toFixed(1)} ★` : null, candidate.address]
    .filter(Boolean)
    .join('  ·  ');
  return (
    <View style={{ backgroundColor: t.color.surface, borderRadius: t.radius.lg, padding: t.space.lg }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${candidate.name}, ${open ? 'hide' : 'show'} details`}
        disabled={!isPlace}
        onPress={() => setOpen((o) => !o)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.color.text, fontSize: t.font.size.lg, fontWeight: '700' }}>{candidate.name}</Text>
          {meta ? <Text style={{ color: t.color.textDim, fontSize: t.font.size.sm, marginTop: 2 }}>{meta}</Text> : null}
        </View>
        {tag ? <Text style={{ color: t.color.accent, fontWeight: '700' }}>{tag}</Text> : null}
      </Pressable>
      {open && isPlace ? <Detail candidate={candidate} /> : null}
      {isPlace ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Directions to ${candidate.name}`}
          onPress={() => void Linking.openURL(mapsDirectionsUrl(candidate)).catch(() => {})}
          style={{
            marginTop: t.space.md,
            alignSelf: 'flex-start',
            borderRadius: t.radius.pill,
            borderWidth: 1,
            borderColor: t.color.accent,
            paddingHorizontal: t.space.lg,
            paddingVertical: t.space.sm,
          }}
        >
          <Text style={{ color: t.color.accent, fontWeight: '700' }}>Directions</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
