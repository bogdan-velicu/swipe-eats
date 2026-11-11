import { Image, StyleSheet, Text, View } from 'react-native';
import type { Candidate } from '../../core/types';
import { useTheme } from '../../theme';
import { usePlaceDetail } from '../place/use-place-detail';

/**
 * A restaurant's hero image as a filled tile. Pulls the first Places photo fresh
 * (Google ToS: render-only, never stored) and falls back to the food emoji.
 * Used by the podium and the spotlight so both show the same picture.
 */
export function HeroThumb({ candidate, radius }: { candidate: Candidate; radius?: number }) {
  const t = useTheme();
  const { photos } = usePlaceDetail(candidate.placeId);
  const br = radius ?? t.radius.md;
  const uri = photos[0];
  return (
    <View style={[styles.fill, { borderRadius: br, backgroundColor: t.color.surfaceGlass }]}>
      {uri ? (
        <Image source={{ uri }} style={[styles.fill, { borderRadius: br }]} resizeMode="cover" />
      ) : (
        <View style={[styles.fill, styles.center]}>
          <Text style={{ fontSize: 40 }}>{candidate.kind === 'place' ? '🍽️' : (candidate.emoji ?? '🍽️')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%', overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
