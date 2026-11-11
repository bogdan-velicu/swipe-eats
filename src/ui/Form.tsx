import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { BADGE_COLORS, BADGE_EMOJIS, type Badge } from '../features/join/badges';
import { useTheme } from '../theme';

export function Label({ children }: { children: string }) {
  const t = useTheme();
  return (
    <Text style={{ color: t.color.textDim, fontSize: t.font.size.sm, fontWeight: '600', marginTop: t.space.xl, marginBottom: t.space.sm }}>
      {children}
    </Text>
  );
}

export function Field(props: TextInputProps) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.color.textDim}
      {...props}
      style={[
        {
          backgroundColor: t.color.surface,
          color: t.color.text,
          borderRadius: t.radius.md,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.md,
          fontSize: t.font.size.md,
        },
        props.style,
      ]}
    />
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  const t = useTheme();
  if (!children) return null;
  return (
    <Text accessibilityRole="alert" style={{ color: t.color.pass, marginTop: t.space.md }}>
      {children}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  disabled,
  secondary,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: secondary ? t.color.surface : t.color.accent,
        opacity: disabled ? 0.5 : 1,
        borderRadius: t.radius.pill,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: t.space.lg,
        alignSelf: 'stretch',
      }}
    >
      <Text style={{ color: secondary ? t.color.text : t.color.bg, fontSize: t.font.size.md, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.color.surface, borderRadius: t.radius.pill, padding: 4 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: t.radius.pill, backgroundColor: active ? t.color.accent : 'transparent' }}
          >
            <Text style={{ color: active ? t.color.bg : t.color.textDim, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function BadgePicker({ value, onChange }: { value: Badge; onChange: (b: Badge) => void }) {
  const t = useTheme();
  return (
    <View>
      <View style={styles.row}>
        {BADGE_EMOJIS.map((e) => (
          <Pressable
            key={e}
            accessibilityRole="button"
            accessibilityLabel={`Emoji ${e}`}
            onPress={() => onChange({ ...value, emoji: e })}
            style={[styles.chip, { backgroundColor: t.color.surface, borderColor: e === value.emoji ? t.color.accent : 'transparent' }]}
          >
            <Text style={{ fontSize: 22 }}>{e}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.row, { marginTop: t.space.sm }]}>
        {BADGE_COLORS.map((c) => (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityLabel={`Color ${c}`}
            onPress={() => onChange({ ...value, color: c })}
            style={[styles.dot, { backgroundColor: c, borderColor: c === value.color ? t.color.text : 'transparent' }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  dot: { width: 32, height: 32, borderRadius: 16, borderWidth: 3 },
});
