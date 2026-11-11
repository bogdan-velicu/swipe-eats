import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Candidate } from '../../core/types';
import { useTheme } from '../../theme';
import { usePlaceDetail } from '../place/use-place-detail';

/**
 * A restaurant's hero image as a filled tile. Pulls the first Places photo from the
 * session cache (already warmed while swiping / by the results prefetch, so usually
 * instant) and falls back to the food emoji. The image fades in on load — and reverts
 * to the emoji if it fails — so there's never a hard placeholder pop. Used by the podium
 * and the spotlight so both show the same picture.
 */
export function HeroThumb({ candidate, radius }: { candidate: Candidate; radius?: number }) {
  const t = useTheme();
  const { photos } = usePlaceDetail(candidate.placeId);
  const br = radius ?? t.radius.md;
  const uri = photos[0];
  const [failed, setFailed] = useState(false);

  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = 0;
    setFailed(false);
  }, [uri, opacity]);
  const imgStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const showEmoji = !uri || failed;
  return (
    <View style={[styles.fill, { borderRadius: br, backgroundColor: t.color.surfaceGlass }]}>
      {showEmoji ? (
        <View style={[styles.fill, styles.center]}>
          <Text style={{ fontSize: 40 }}>{candidate.kind === 'place' ? '🍽️' : (candidate.emoji ?? '🍽️')}</Text>
        </View>
      ) : (
        <Animated.Image
          source={{ uri }}
          style={[styles.fill, { borderRadius: br }, imgStyle]}
          resizeMode="cover"
          onLoad={() => {
            opacity.value = withTiming(1, { duration: 220 });
          }}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%', overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
