import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { displayName, type ProfileSummary } from '@/lib/profiles';

type PersonHeaderTitleProps = {
  person: Pick<ProfileSummary, 'display_name' | 'avatar_url'> | null;
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
      <Avatar profile={person} size={40} />
      <View style={styles.text}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {displayName(person)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          View profile
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  text: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
