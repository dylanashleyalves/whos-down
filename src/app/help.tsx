import { ScrollView, StyleSheet, View } from 'react-native';

import { SocialIcon } from '@/components/social-icon';
import { SpotifySteps } from '@/components/spotify-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { SOCIAL_STEPS, SOCIALS, type SocialKey } from '@/lib/socials';

// Add new setup help here as the app grows.
const OTHER_SOCIALS: SocialKey[] = ['instagram', 'telegram', 'tiktok'];

export default function HelpScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="smallBold">Adding your socials</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Go to Profile, then Edit profile. Only your crew can see these.
        </ThemedText>

        {OTHER_SOCIALS.map((key) => (
          <ThemedView key={key} type="backgroundElement" style={styles.card}>
            <View style={styles.title}>
              <SocialIcon name={key} />
              <ThemedText type="smallBold">{SOCIALS[key].label}</ThemedText>
            </View>
            {SOCIAL_STEPS[key].map((step, index) => (
              <ThemedText key={step} type="small" themeColor="textSecondary">
                {index + 1}. {step}
              </ThemedText>
            ))}
          </ThemedView>
        ))}

        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.title}>
            <SocialIcon name="spotify" />
            <ThemedText type="smallBold">{SOCIALS.spotify.label}</ThemedText>
          </View>
          <SpotifySteps />
        </ThemedView>

        <ThemedText type="smallBold">Messaging someone</ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="small" themeColor="textSecondary">
            Join an activity together. Afterwards, if you both tap &quot;Hang again?&quot;, you join
            each other&apos;s crew and can message each other.
          </ThemedText>
        </ThemedView>

        <ThemedText type="smallBold">Still stuck?</ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="small" themeColor="textSecondary">
            Go back to Settings and use the feedback box under Help, or email
            dylanashleyalves@gmail.com.
          </ThemedText>
        </ThemedView>
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
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
