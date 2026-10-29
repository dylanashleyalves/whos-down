import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingEmoji, Orb } from '@/components/art';
import { ProfileForm } from '@/components/profile-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
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
              <Orb size={200} color="#ffffff40" at={{ top: -80, right: -60 }} />
              <Orb size={150} color="#F9731666" at={{ bottom: -70, left: -40 }} />
              <FloatingEmoji emoji="👋" size={42} rotate={-14} at={{ top: 12, right: 18 }} />
              <FloatingEmoji
                emoji="✨"
                size={22}
                rotate={0}
                opacity={0.9}
                at={{ top: 64, right: 70 }}
              />
              <ThemedText type="smallBold" style={styles.kicker}>
                WHO&apos;S DOWN
              </ThemedText>
              <ThemedText type="subtitle" style={styles.title}>
                {returning ? 'One more step' : 'Set up your profile'}
              </ThemedText>
              <ThemedText style={styles.text}>
                {returning
                  ? 'To keep everyone safe, confirm a few details. You only do this once.'
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
  // Same sunset card as the Feed's welcome banner.
  header: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    backgroundColor: Brand.purple,
    backgroundImage: Brand.sunset,
    overflow: 'hidden',
  },
  kicker: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  title: {
    color: '#ffffff',
    // Leave room for the emojis on the right.
    marginRight: 80,
  },
  text: {
    color: 'rgba(255, 255, 255, 0.92)',
  },
});
