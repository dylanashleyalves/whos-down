import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import type { Profile } from '@/lib/profiles';

// Nudges people to finish their profile, so others know who they're meeting. Shows just
// the next step and disappears once everything is done.
export function ProfileChecklist({ profile }: { profile: Profile }) {
  const steps = [
    { label: 'Add a photo', done: !!profile.avatar_url },
    { label: 'Write a short bio', done: !!profile.bio?.trim() },
    { label: 'Pick what you’re into', done: profile.interests.length > 0 },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  if (!next) return null;

  return (
    <Pressable
      onPress={() => router.push('/edit-profile')}
      accessibilityRole="button"
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.row}>
          <View style={styles.count}>
            <ThemedText type="smallBold" style={styles.countText}>
              {doneCount}/{steps.length}
            </ThemedText>
          </View>
          <View style={styles.grow}>
            <ThemedText type="smallBold">Finish your profile</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Next: {next.label}
            </ThemedText>
          </View>
          <ThemedText type="subtitle" themeColor="textSecondary">
            ›
          </ThemedText>
        </View>
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${(doneCount / steps.length) * 100}%` }]} />
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  count: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.purple,
    backgroundImage: Brand.gradient,
  },
  countText: {
    color: '#ffffff',
  },
  grow: {
    flex: 1,
  },
  bar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B833',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: Brand.purple,
    backgroundImage: Brand.gradient,
  },
  pressed: {
    opacity: 0.7,
  },
});
