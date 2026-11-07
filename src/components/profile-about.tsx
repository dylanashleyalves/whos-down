import { StyleSheet, View } from 'react-native';

import { Pill } from '@/components/pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { Categories } from '@/lib/activities';
import { FREE_TIMES } from '@/lib/availability';
import type { Profile } from '@/lib/profiles';

type ProfileAboutProps = {
  profile: Pick<Profile, 'bio' | 'interests' | 'free_times'> | null;
};

// Who someone is at a glance: bio, interests and when they're free. Hidden if all are empty.
export function ProfileAbout({ profile }: ProfileAboutProps) {
  const interests = profile?.interests ?? [];
  const freeTimes = profile?.free_times ?? [];
  if (!profile?.bio && interests.length === 0 && freeTimes.length === 0) return null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">About</ThemedText>
      {profile?.bio && <ThemedText type="small">{profile.bio}</ThemedText>}
      {interests.length > 0 && (
        <View style={styles.interests}>
          {interests.map((key) => (
            <Pill
              key={key}
              color={Categories[key]?.color ?? Brand.blue}
              label={`${Categories[key]?.emoji ?? ''} ${Categories[key]?.label ?? key}`}
            />
          ))}
        </View>
      )}
      {freeTimes.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          🕒 Usually free {freeTimes.map((key) => FREE_TIMES[key].toLowerCase()).join(', ')}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
});
