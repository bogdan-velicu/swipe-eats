import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

export function Placeholder({ title }: { title: string }) {
  const t = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: t.color.bg }]}>
      <Text style={{ color: t.color.text, fontSize: t.font.size.xl, fontWeight: '700' }}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
