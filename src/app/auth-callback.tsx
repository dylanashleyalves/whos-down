import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { createSessionFromUrl } from '@/lib/google-auth';

// Where the app lands when Google sign-in sends people back. Usually the sign-in screen
// has already finished signing in; this catches the case where the phone reopened the
// app from the link instead, then moves on.
export default function AuthCallbackScreen() {
  const linkingUrl = Linking.useLinkingURL();
  const url = Platform.OS === 'web' ? window.location.href : linkingUrl;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    createSessionFromUrl(url)
      .then(() => router.replace('/'))
      .catch((e: Error) => setError(e.message));
  }, [url]);

  return (
    <ThemedView style={styles.container}>
      {error ? (
        <>
          <ThemedText type="smallBold">Couldn&apos;t sign in with Google</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            {error}
          </ThemedText>
          <ThemedText type="linkPrimary" onPress={() => router.replace('/sign-in')}>
            Back to sign in
          </ThemedText>
        </>
      ) : (
        <ActivityIndicator size="large" />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  center: {
    textAlign: 'center',
  },
});
