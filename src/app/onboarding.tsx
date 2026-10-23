import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileForm } from '@/components/profile-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';

// Shown after sign-up, and to existing users until they confirm their age.
// Saving moves the user into the app.
export default function OnboardingScreen() {
  const { profile } = useAuth();
  const returning = !!profile?.display_name;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ProfileForm
          submitLabel="Let's go"
          onSaved={() => {}}
          header={
            <View style={styles.header}>
              <ThemedText type="subtitle">
                {returning ? 'One more step' : 'Set up your profile'}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {returning
                  ? 'To keep everyone safe, confirm your age and agree to the community guidelines.'
                  : 'People are more likely to say they’re down when they can see who you are.'}
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
