import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Brand } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ProfileSummary } from '@/lib/profiles';

type AvatarRingProps = {
  profile: Pick<ProfileSummary, 'display_name' | 'avatar_url'> | null | undefined;
  size: number;
};

// A big profile photo with a brand-gradient ring around it.
export function AvatarRing({ profile, size }: AvatarRingProps) {
  const theme = useTheme();
  return (
    <View style={[styles.ring, { borderRadius: (size + 12) / 2 }]}>
      <View
        style={[styles.gap, { borderRadius: (size + 6) / 2, backgroundColor: theme.background }]}>
        <Avatar profile={profile} size={size} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    padding: 3,
    backgroundColor: Brand.purple,
    backgroundImage: Brand.sunset,
  },
  gap: {
    padding: 3,
  },
});
