import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { SocialIcon } from '@/components/social-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SOCIAL_KEYS, SOCIALS, type Socials } from '@/lib/socials';

// What you've added, so you can see it without opening Edit profile. Tapping goes there.
export function MySocials({ socials }: { socials: Socials | null }) {
  return (
    <Pressable
      onPress={() => router.push('/edit-profile')}
      accessibilityRole="button"
      accessibilityLabel="Edit your socials"
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Your socials</ThemedText>
        {SOCIAL_KEYS.map((key) => {
          const handle = socials?.[key];
          return (
            <View key={key} style={styles.row}>
              <SocialIcon name={key} size={28} />
              <ThemedText type="small" style={styles.grow} numberOfLines={1}>
                {SOCIALS[key].label}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.value}
                numberOfLines={1}>
                {/* Spotify ids are usually random letters, so don't show them. */}
                {handle ? (key === 'spotify' ? 'Added' : handle) : 'Add'}
              </ThemedText>
            </View>
          );
        })}
        <ThemedText type="small" themeColor="textSecondary">
          🔒 Only your crew can see these.
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  value: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
