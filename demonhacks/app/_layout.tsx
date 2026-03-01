import { useEffect } from 'react';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';

import { TamboProvider } from '@tambo-ai/react';
import { useAuthStore } from '@/stores/auth-store';
import { useProtectedRoute } from '@/components/auth/AuthGate';
import { colors, fonts } from '@/lib/theme';
import { components } from '@/src/lib/tambo';
import { tools } from '@/src/lib/tambo-tools';
import { mapContextHelper } from '@/src/lib/tambo-context';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// ExploreChi light theme (no dark mode)
const ExploreChiTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.white,
    text: colors.textPrimary,
    border: colors.borderLight,
    notification: colors.error,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Satoshi-Regular': require('../assets/fonts/Satoshi-Regular.otf'),
    'Satoshi-Medium': require('../assets/fonts/Satoshi-Medium.otf'),
    'Satoshi-Bold': require('../assets/fonts/Satoshi-Bold.otf'),
    'Satoshi-Black': require('../assets/fonts/Satoshi-Black.otf'),
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Inject @font-face declarations for web so CSS-based components
  // (like LabelPin's injected styles) can also use Satoshi
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        @font-face { font-family: 'Satoshi-Regular'; src: url('/fonts/Satoshi-Regular.otf') format('opentype'); font-weight: 400; font-display: swap; }
        @font-face { font-family: 'Satoshi-Medium'; src: url('/fonts/Satoshi-Medium.otf') format('opentype'); font-weight: 500; font-display: swap; }
        @font-face { font-family: 'Satoshi-Bold'; src: url('/fonts/Satoshi-Bold.otf') format('opentype'); font-weight: 700; font-display: swap; }
        @font-face { font-family: 'Satoshi-Black'; src: url('/fonts/Satoshi-Black.otf') format('opentype'); font-weight: 900; font-display: swap; }
      `;
      document.head.appendChild(style);
      return () => { document.head.removeChild(style); };
    }
  }, []);

  // Initialize Supabase auth listener
  useEffect(() => {
    const cleanup = initialize();
    return cleanup;
  }, []);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  // Protect routes — redirects to sign-in if not authenticated
  useProtectedRoute();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={ExploreChiTheme}>
        <TamboProvider
          apiKey={process.env.EXPO_PUBLIC_TAMBO_API_KEY!}
          components={components}
          tools={tools}
          contextHelpers={{ mapViewport: mapContextHelper }}
        >
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.white },
              headerTintColor: colors.primary,
              headerTitleStyle: { fontFamily: fonts.bold },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
            <Stack.Screen name="edit-preferences" options={{ headerShown: false }} />
            <Stack.Screen name="quest/[id]" options={{ title: 'Quest', headerBackTitle: 'Back' }} />
            <Stack.Screen name="spot/[id]" options={{ title: 'Spot', headerBackTitle: 'Back' }} />
            <Stack.Screen name="chat/[id]" options={{ title: 'Chat', headerBackTitle: 'Back' }} />
            <Stack.Screen name="friends/search" options={{ title: 'Find Friends', headerBackTitle: 'Back' }} />
            <Stack.Screen name="friends/[id]" options={{ title: 'Profile', headerBackTitle: 'Back' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </TamboProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
