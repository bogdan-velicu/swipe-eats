import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import type { Candidate } from '../../core/types';
import { useTheme } from '../../theme';
import { HeroThumb } from './HeroThumb';
import { geoUri, mapsDirectionsUrl } from './mapsLink';

/** Opens the OS navigation-app chooser (Maps / Waze / Bolt / …) via a `geo:` intent,
 * falling back to a Google Maps link where `geo:` isn't handled. */
async function openNavigation(c: Candidate) {
  const geo = geoUri(c);
  try {
    if (await Linking.canOpenURL(geo)) {
      await Linking.openURL(geo);
      return;
    }
  } catch {
    // fall through to the web link
  }
  await Linking.openURL(mapsDirectionsUrl(c)).catch(() => {});
}

/**
 * A closeup of the tapped restaurant floating over a blurred, dimmed backdrop (the iOS
 * sheet effect). Big photo, name and rating up top; a tappable location row with a map
 * pin at the bottom that hands off to a navigation app. Tap the backdrop or ✕ to dismiss.
 */
export function Spotlight({ candidate, onClose }: { candidate: Candidate | null; onClose: () => void }) {
  const t = useTheme();
  const location = candidate?.address ?? (candidate?.location ? 'Open in maps' : null);
  return (
    <Modal visible={!!candidate} transparent animationType="none" onRequestClose={onClose}>
      {candidate ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.fill}>
          <BlurView intensity={40} tint="dark" style={styles.fill}>
            <Pressable accessibilityLabel="Close" style={[styles.fill, styles.dim, styles.center]} onPress={onClose}>
              {/* Inner Pressable swallows taps so touching the card doesn't dismiss. */}
              <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.cardWrap}>
                <Pressable onPress={() => {}} style={[styles.card, { backgroundColor: t.color.surface }]}>
                  <View style={styles.photo}>
                    <HeroThumb candidate={candidate} radius={0} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Close"
                      onPress={onClose}
                      style={styles.close}
                    >
                      <Text style={styles.closeText}>✕</Text>
                    </Pressable>
                  </View>

                  <View style={{ padding: t.space.xl }}>
                    <Text numberOfLines={2} style={[styles.name, { color: t.color.text }]}>
                      {candidate.name}
                    </Text>
                    {candidate.rating != null ? (
                      <Text style={[styles.rating, { color: t.color.accent }]}>
                        ★ {candidate.rating.toFixed(1)}
                        {candidate.userRatingCount != null ? (
                          <Text style={{ color: t.color.textDim }}>  ({candidate.userRatingCount})</Text>
                        ) : null}
                      </Text>
                    ) : null}

                    {location ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Navigate to ${candidate.name}`}
                        onPress={() => void openNavigation(candidate)}
                        style={({ pressed }) => [
                          styles.locationRow,
                          { borderColor: t.color.surfaceGlass, opacity: pressed ? 0.6 : 1 },
                        ]}
                      >
                        <Text style={styles.pin}>📍</Text>
                        <Text numberOfLines={2} style={[styles.location, { color: t.color.text }]}>
                          {location}
                        </Text>
                        <Text style={[styles.chevron, { color: t.color.accent }]}>›</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Pressable>
              </Animated.View>
            </Pressable>
          </BlurView>
        </Animated.View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dim: { backgroundColor: 'rgba(8,8,12,0.55)' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  cardWrap: { width: '100%', maxWidth: 420 },
  card: { width: '100%', borderRadius: 24, overflow: 'hidden' },
  photo: { height: 240, width: '100%' },
  close: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(8,8,12,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  name: { fontSize: 24, fontWeight: '800' },
  rating: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pin: { fontSize: 18 },
  location: { flex: 1, fontSize: 15, fontWeight: '600' },
  chevron: { fontSize: 22, fontWeight: '800' },
});
