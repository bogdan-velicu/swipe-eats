import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button } from '../../ui/Form';
import { useTheme } from '../../theme';
import { parseJoinLink } from './useDeepLink';

/**
 * Scans a QR whose payload is a join link or bare code. Calls onCode once with the normalized
 * code; unrecognised QRs are ignored. Handles the camera permission flow.
 */
export function QrScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const t = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.center, { padding: t.space.xl }]}>
        <Text style={{ color: t.color.text, fontSize: t.font.size.lg, fontWeight: '700', textAlign: 'center' }}>
          Camera access needed
        </Text>
        <Text style={{ color: t.color.textDim, textAlign: 'center', marginTop: t.space.sm }}>
          {permission.canAskAgain
            ? 'Allow the camera to scan a Swipe Eats QR code.'
            : 'Enable camera access in Settings, or type the code instead.'}
        </Text>
        {permission.canAskAgain ? <Button title="Allow camera" onPress={() => void requestPermission()} /> : null}
        <Button title="Type code instead" secondary onPress={onClose} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (handled.current) return;
          const code = parseJoinLink(data);
          if (!code) return;
          handled.current = true;
          onCode(code);
        }}
      />
      <View style={[styles.footer, { padding: t.space.xl }]}>
        <Text style={{ color: t.color.text, textAlign: 'center' }}>Point at the host's QR code</Text>
        <Button title="Type code instead" secondary onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
