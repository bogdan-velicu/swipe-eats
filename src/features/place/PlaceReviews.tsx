import { Image, Linking, Text, View } from 'react-native';
import type { Review } from '../../backend/placesClient';
import { useTheme } from '../../theme';

/**
 * Shows the reviews Google returned, each with its required author attribution
 * (name, linked when a URI is supplied, plus photo). Rendered only; never persisted.
 * `max` only limits display (e.g. a one-review snippet); the hook never trims.
 */
export function PlaceReviews({ reviews, max }: { reviews: Review[]; max?: number }) {
  const t = useTheme();
  const shown = max != null ? reviews.slice(0, max) : reviews;
  if (shown.length === 0) return null;
  return (
    <View style={{ gap: t.space.sm }}>
      {shown.map((r, i) => {
        const a = r.attributions;
        return (
          <View key={`${a.authorName ?? ''}-${i}`}>
            {r.text ? (
              <Text numberOfLines={3} style={{ color: t.color.text, fontSize: t.font.size.sm }}>
                {r.rating != null ? `★ ${r.rating}  ` : ''}“{r.text}”
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: t.space.xs, gap: t.space.xs }}>
              {a.authorPhotoUri ? (
                <Image source={{ uri: a.authorPhotoUri }} style={{ width: 16, height: 16, borderRadius: 8 }} />
              ) : null}
              <Text
                numberOfLines={1}
                onPress={a.authorUri ? () => void Linking.openURL(a.authorUri!) : undefined}
                style={{ color: t.color.textDim, fontSize: t.font.size.sm }}
              >
                {a.authorName ?? 'Google user'}
                {r.relativeTime ? ` · ${r.relativeTime}` : ''}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
