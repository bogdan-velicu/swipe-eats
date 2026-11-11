import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { Candidate } from '../../core/types';
import { useTheme } from '../../theme';
import { usePlaceDetail } from '../place/use-place-detail';

/**
 * A restaurant's hero image as a filled tile. Pulls the first Places photo from the
 * session cache (already warmed while swiping / by the results prefetch, so usually
 * instant) and falls back to the food emoji — reverting to it if the image fails to load.
 *
 * The photo is drawn solid: no opacity fade. The cache removes the re-fetch flash the
 * fade was meant to hide, and a fade gated on the image's load event could leave a tile
 * blank if that event didn't fire. Used by the podium and the spotlight.
 */
export function HeroThumb({ candidate, radius }: { candidate: Candidate; radius?: number }) {
  const t = useTheme();
  const { photos } = usePlaceDetail(candidate.placeId);
  const br = radius ?? t.radius.md;
  const uri = photos[0];
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [uri]);

  const showEmoji = !uri || failed;
  return (
    <View style={[styles.fill, { borderRadius: br, backgroundColor: t.color.surfaceGlass }]}>
      {showEmoji ? (
        <View style={[styles.fill, styles.center]}>
          <Text style={{ fontSize: 40 }}>{candidate.kind === 'place' ? '🍽️' : (candidate.emoji ?? '🍽️')}</Text>
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={[styles.fill, { borderRadius: br }]}
          resizeMode="cover"
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
