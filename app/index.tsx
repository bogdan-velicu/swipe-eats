import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../src/state/settings';
import { useTheme } from '../src/theme';
import type { UnitSystem } from '../src/core/units';

const UNITS: UnitSystem[] = ['metric', 'imperial'];

export default function Home() {
  const t = useTheme();
  const { unit, setUnit } = useSettings();
  return (
    <View style={[styles.root, { backgroundColor: t.color.bg, padding: t.space.xl }]}>
      <Text style={{ color: t.color.text, fontSize: t.font.size.xxl, fontWeight: '800' }}>Swipe Eats</Text>
      <Text style={{ color: t.color.textDim, fontSize: t.font.size.md, marginBottom: t.space.xxl }}>
        Decide dinner together.
      </Text>

      <Link href="/create" asChild>
        <Pressable
          accessibilityRole="button"
          style={[styles.btn, { backgroundColor: t.color.accent, borderRadius: t.radius.pill }]}
        >
          <Text style={[styles.btnText, { color: t.color.bg }]}>Start a session</Text>
        </Pressable>
      </Link>
      <Link href="/join" asChild>
        <Pressable
          accessibilityRole="button"
          style={[styles.btn, { backgroundColor: t.color.surface, borderRadius: t.radius.pill, marginTop: t.space.md }]}
        >
          <Text style={[styles.btnText, { color: t.color.text }]}>Join</Text>
        </Pressable>
      </Link>

      <View style={[styles.toggle, { backgroundColor: t.color.surface, borderRadius: t.radius.pill, marginTop: t.space.xxl }]}>
        {UNITS.map((u) => {
          const active = u === unit;
          return (
            <Pressable
              key={u}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => void setUnit(u)}
              style={[styles.seg, { borderRadius: t.radius.pill, backgroundColor: active ? t.color.accent : 'transparent' }]}
            >
              <Text style={{ color: active ? t.color.bg : t.color.textDim, fontWeight: '600' }}>
                {u === 'metric' ? 'km' : 'mi'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center' },
  btn: { paddingVertical: 16, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700' },
  toggle: { flexDirection: 'row', alignSelf: 'center', padding: 4 },
  seg: { paddingVertical: 8, paddingHorizontal: 24 },
});
