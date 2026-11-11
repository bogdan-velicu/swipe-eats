import type { ExpoConfig } from 'expo/config';

// Placeholder universal-link domain (keep in sync with src/features/join/useDeepLink.ts).
const LINK_HOST = 'swipeeats.example.com';

const config: ExpoConfig = {
  name: 'Swipe Eats',
  slug: 'swipe-eats',
  owner: 'zotrix',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#0c0c10',
  scheme: 'swipeeats',
  platforms: ['ios', 'android'],
  plugins: [
    'expo-router',
    'expo-localization',
    ['expo-camera', { cameraPermission: 'Swipe Eats uses the camera to scan a join QR code.', recordAudioAndroid: false }],
    ['expo-location', { locationWhenInUsePermission: 'Swipe Eats uses your location to find places near you.' }],
    // Shrink the release build: R8 code minification + unused-resource stripping.
    [
      'expo-build-properties',
      {
        android: {
          enableProguardInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
        },
      },
    ],
  ],
  extra: { eas: { projectId: 'fba48804-be68-4f8e-9a73-deb46d48d81e' } },
  ios: { supportsTablet: false, bundleIdentifier: 'app.swipeeats.dinner', associatedDomains: [`applinks:${LINK_HOST}`] },
  android: {
    package: 'app.swipeeats.dinner',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: LINK_HOST, pathPrefix: '/join' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    adaptiveIcon: {
      // Matches the emblem's near-black corners so the foreground has no visible seam.
      backgroundColor: '#010102',
      foregroundImage: './assets/android-icon-foreground.png',
    },
  },
};

export default config;
