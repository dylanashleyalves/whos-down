import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileForm } from '@/components/profile-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Shown once after sign-up. Saving the profile moves the user into the app.
export default function OnboardingScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ProfileForm
          submitLabel="Let's go"
          onSaved={() => {}}
          header={
            <View style={styles.header}>
              <ThemedText type="subtitle">Set up your profile</ThemedText>
              <ThemedText themeColor="textSecondary">
                People are more likely to say they&apos;re down when they can see who you are.
              </ThemedText>
            </View>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    gap: Spacing.two,
  },
});
