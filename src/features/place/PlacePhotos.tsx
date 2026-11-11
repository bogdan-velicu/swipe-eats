import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import { nextPhotoPage } from './photoNav';

/**
 * Tap-navigated gallery: tap the left/right half to change photo. Photo URLs are
 * Google's short-lived URIs — render only, never store.
 *
 * Deliberately NOT a horizontal pager: a swipe-driven gallery sits inside the
 * swipe-card's pan gesture and the two fight over horizontal drags (you end up
 * swiping the card instead of the photo, and the next card peeks through). Taps
 * don't collide with the card's drag, so navigation stays reliable.
 */
export function PlacePhotos({ photos, fallbackEmoji = '🍽️' }: { photos: string[]; fallbackEmoji?: string }) {
  const t = useTheme();
  const [page, setPage] = useState(0);

  if (photos.length === 0) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: t.color.surfaceGlass }]}>
        <Text style={styles.emoji}>{fallbackEmoji}</Text>
      </View>
    );
  }

  const idx = Math.min(Math.max(0, page), photos.length - 1);
  const go = (delta: number) => setPage((p) => nextPhotoPage(p, photos.length, delta));

  return (
    <View style={[styles.fill, { backgroundColor: t.color.surfaceGlass }]}>
      <Image key={photos[idx]} source={{ uri: photos[idx] }} style={styles.fill} resizeMode="cover" />
      {photos.length > 1 && (
        <>
          <Pressable accessibilityLabel="Previous photo" style={[styles.zone, styles.left]} onPress={() => go(-1)} />
          <Pressable accessibilityLabel="Next photo" style={[styles.zone, styles.right]} onPress={() => go(1)} />
          <View style={styles.dots} pointerEvents="none">
            {photos.map((uri, i) => (
              <View key={uri} style={[styles.dot, { backgroundColor: t.color.text, opacity: i === idx ? 1 : 0.4 }]} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 96 },
  zone: { position: 'absolute', top: 0, bottom: 0, width: '50%' },
  left: { left: 0 },
  right: { right: 0 },
  dots: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
