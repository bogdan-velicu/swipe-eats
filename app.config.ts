import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Swipe Eats',
  slug: 'swipe-eats',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#0c0c10',
  platforms: ['ios', 'android'],
  ios: { supportsTablet: false, bundleIdentifier: 'app.swipeeats.dinner' },
  android: {
    package: 'app.swipeeats.dinner',
    adaptiveIcon: {
      backgroundColor: '#0c0c10',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
};

export default config;
