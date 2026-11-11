import { Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '../../ui/Form';
import { useTheme } from '../../theme';
import { buildJoinLink } from './useDeepLink';

/** Shows the session code, a QR of the deep link, and a system share sheet action. */
export function ShareCard({ code }: { code: string }) {
  const t = useTheme();
  const link = buildJoinLink(code);
  return (
    <View style={[styles.card, { backgroundColor: t.color.surface, borderRadius: t.radius.lg, padding: t.space.xl }]}>
      <Text style={{ color: t.color.textDim, fontSize: t.font.size.sm }}>Join code</Text>
      <Text selectable style={{ color: t.color.text, fontSize: t.font.size.xxl, fontWeight: '800', letterSpacing: 6 }}>
        {code}
      </Text>
      <View style={{ backgroundColor: '#fff', padding: t.space.md, borderRadius: t.radius.md, marginTop: t.space.lg }}>
        <QRCode value={link} size={160} />
      </View>
      <Button
        title="Share invite"
        onPress={() => void Share.share({ message: `Join my Swipe Eats session: code ${code}\n${link}` })}
      />
    </View>
  );
}

const styles = StyleSheet.create({ card: { alignItems: 'center' } });
