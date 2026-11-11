import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../src/theme';

function Navigator() {
  const t = useTheme();
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.color.bg },
          headerTintColor: t.color.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: t.color.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="create" options={{ title: 'Start a session' }} />
        <Stack.Screen name="join" options={{ title: 'Join' }} />
        <Stack.Screen name="lobby" options={{ title: 'Lobby' }} />
        <Stack.Screen name="swipe" options={{ title: 'Swipe', headerShown: false }} />
        <Stack.Screen name="results" options={{ title: 'Results' }} />
        <Stack.Screen name="recap" options={{ title: 'Recap' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Navigator />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
