import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { isSetupComplete } from '@/lib/profiles';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, profile, privateProfile, isLoading } = useAuth();

  // Keep the native splash screen up until we know who the user is.
  if (isLoading) return null;

  const signedIn = !!session;
  const hasProfile = isSetupComplete(profile, privateProfile);
  // Where blocked screens send people. Without this, Expo Router falls back to the
  // first open screen by file name, which is the guidelines page: a dead end.
  const home = !signedIn ? '/sign-in' : hasProfile ? '/' : '/onboarding';

  return (
    <>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn && hasProfile} redirectTo={home}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="new-activity"
            options={{ presentation: 'modal', headerShown: true, title: 'Post an activity' }}
          />
          <Stack.Screen name="activity/[id]" options={{ headerShown: true, title: 'Activity' }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: 'Group chat' }} />
          <Stack.Screen
            name="edit-profile"
            options={{ presentation: 'modal', headerShown: true, title: 'Edit profile' }}
          />
          <Stack.Screen name="user/[id]" options={{ headerShown: true, title: 'Profile' }} />
          <Stack.Screen
            name="report"
            options={{ presentation: 'modal', headerShown: true, title: 'Report' }}
          />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !hasProfile} redirectTo={home}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn} redirectTo={home}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Screen
          name="guidelines"
          options={{ headerShown: true, title: 'Community guidelines' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
