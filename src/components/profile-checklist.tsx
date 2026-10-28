import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import type { Profile } from '@/lib/profiles';

// Nudges people to finish their profile, so others know who they're meeting.
// Disappears once everything is done.
export function ProfileChecklist({ profile }: { profile: Profile }) {
  const steps = [
    { label: 'Add a photo', done: !!profile.avatar_url },
    { label: 'Write a short bio (it styles your cover!)', done: !!profile.bio?.trim() },
    { label: 'Pick what you’re into', done: profile.interests.length > 0 },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <Pressable onPress={() => router.push('/edit-profile')}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.header}>
          <ThemedText type="smallBold">Finish your profile</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {doneCount}/{steps.length}
          </ThemedText>
        </View>
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${(doneCount / steps.length) * 100}%` }]} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          People are more likely to join you when they can see who you are.
        </ThemedText>
        {steps.map((step) => (
          <ThemedText
            key={step.label}
            type="small"
            themeColor={step.done ? 'textSecondary' : 'text'}
            style={step.done && styles.done}>
            {step.done ? '✅' : '⬜'} {step.label}
          </ThemedText>
        ))}
        <ThemedText type="linkPrimary">Edit profile →</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: Brand.purple + '66',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B833',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Brand.purple,
    backgroundImage: Brand.gradient,
  },
  done: {
    textDecorationLine: 'line-through',
  },
});
