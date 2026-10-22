import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, profile, isLoading } = useAuth();

  // Keep the native splash screen up until we know who the user is.
  if (isLoading) return null;

  const signedIn = !!session;
  const hasProfile = !!profile?.display_name;

  return (
    <>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn && hasProfile}>
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
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !hasProfile}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
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
