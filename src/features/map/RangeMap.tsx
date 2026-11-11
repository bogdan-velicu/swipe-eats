import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import type { Candidate, Filters } from '../../core/types';
import { useTheme } from '../../theme';
import { fitRegion, rangeMeters } from './rangeMeters';

// Minimal dark map style (Google provider on Android; Apple Maps on iOS follows userInterfaceStyle).
const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#16161c' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a94' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0c0c10' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a33' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c0c10' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

export interface RangeMapProps {
  filters: Pick<Filters, 'anchor' | 'radiusMeters' | 'maxWalkMin'>;
  /** Place candidates with a location are shown as pins. */
  candidates?: Candidate[];
  style?: StyleProp<ViewStyle>;
}

/** Thin presentational map: anchor marker, reachable-range circle, result pins. Logic lives in rangeMeters. */
export function RangeMap({ filters, candidates = [], style }: RangeMapProps) {
  const t = useTheme();
  const radius = rangeMeters(filters);
  const { anchor } = filters;
  const center = { latitude: anchor.lat, longitude: anchor.lng };
  const region = fitRegion(anchor, radius);
  return (
    <View style={[styles.wrap, { backgroundColor: t.color.surface, borderRadius: t.radius.md }, style]}>
      <MapView
        // key re-centers the camera when the range changes (initialRegion is not reactive)
        key={`${anchor.lat},${anchor.lng},${radius}`}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        customMapStyle={DARK_STYLE}
        userInterfaceStyle="dark"
        rotateEnabled={false}
        toolbarEnabled={false}
      >
        <Circle
          center={center}
          radius={radius}
          strokeColor={t.color.accent}
          strokeWidth={2}
          fillColor="rgba(255,159,67,0.15)"
        />
        <Marker coordinate={center} title="Search center" pinColor={t.color.accent} />
        {candidates.map((c) =>
          c.location ? (
            <Marker
              key={c.id}
              coordinate={{ latitude: c.location.lat, longitude: c.location.lng }}
              title={c.name}
              pinColor={t.color.like}
            />
          ) : null,
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { overflow: 'hidden', height: 260 } });
