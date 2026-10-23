import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { GuidelinesList } from '@/components/guidelines-list';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { isSetupComplete } from '@/lib/profiles';
import { useAuth } from '@/providers/auth-provider';

export default function GuidelinesScreen() {
  const { session, profile, privateProfile } = useAuth();

  // Go straight to where the user belongs. "Back" isn't safe here: the previous
  // screen may be one the user can't open yet, which would bounce them back here.
  function done() {
    if (!session) router.replace('/sign-in');
    else if (!isSetupComplete(profile, privateProfile)) router.replace('/onboarding');
    else if (router.canGoBack()) router.back();
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
