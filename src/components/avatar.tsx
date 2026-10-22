import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { ProfileSummary } from '@/lib/profiles';

type AvatarProps = {
  profile: Pick<ProfileSummary, 'display_name' | 'avatar_url'> | null | undefined;
  size?: number;
};

export function Avatar({ profile, size = 40 }: AvatarProps) {
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (profile?.avatar_url) {
    return <Image source={{ uri: profile.avatar_url }} style={shape} contentFit="cover" />;
  }

  const initial = profile?.display_name?.trim().charAt(0).toUpperCase() || '?';
  return (
    <ThemedView type="backgroundSelected" style={[styles.fallback, shape]}>
      <ThemedText type="smallBold" style={{ fontSize: size * 0.4, lineHeight: size * 0.5 }}>
        {initial}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
