import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { GuidelinesList } from '@/components/guidelines-list';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

export default function GuidelinesScreen() {
  const { session, profile, privateProfile } = useAuth();

  function done() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // Opened directly (e.g. after a page refresh): "/" can't be used here, because the
    // sign-in guards bounce it back to this page. Go straight to where the user belongs.
    if (!session) router.replace('/sign-in');
    else if (!profile?.display_name || !privateProfile) router.replace('/onboarding');
    else router.replace('/');
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <GuidelinesList />
        <PrimaryButton label="Got it" onPress={done} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
  },
});
