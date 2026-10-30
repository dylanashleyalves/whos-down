import { Pressable, StyleSheet } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { displayName, type ProfileSummary } from '@/lib/profiles';

type PersonHeaderTitleProps = {
  person: ProfileSummary | null;
  onPress: () => void;
};

// Their photo and name at the top of a conversation. Tapping opens their profile.
export function PersonHeaderTitle({ person, onPress }: PersonHeaderTitleProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${displayName(person)}'s profile`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Avatar profile={person} size={32} />
      <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
        {displayName(person)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
