import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';

/** Horizontally paged gallery. Photo URLs are Google's short-lived URIs: render only, never store. */
export function PlacePhotos({ photos, fallbackEmoji = '🍽️' }: { photos: string[]; fallbackEmoji?: string }) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const [page, setPage] = useState(0);

  if (photos.length === 0) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: t.color.surfaceGlass }]}>
        <Text style={styles.emoji}>{fallbackEmoji}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.fill, { backgroundColor: t.color.surfaceGlass }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))}
        >
          {photos.map((uri) => (
            <Image key={uri} source={{ uri }} style={{ width: w, height: '100%' }} resizeMode="cover" />
          ))}
        </ScrollView>
      )}
      {photos.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {photos.map((uri, i) => (
            <View
              key={uri}
              style={[styles.dot, { backgroundColor: t.color.text, opacity: i === page ? 1 : 0.4 }]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 96 },
  dots: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
