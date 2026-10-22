import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { ProfileSummary } from '@/lib/profiles';

type AvatarProps = {
  profile: Pick<ProfileSummary, 'display_name' | 'avatar_url'> | null | undefined;
  size?: number;
};

export function Avatar({ profile, size = 40 }: AvatarProps) {
  // If a photo fails to load, show the initial instead of an empty circle.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const shape = { width: size, height: size, borderRadius: size / 2 };
  const url = profile?.avatar_url;

  if (url && url !== failedUrl) {
    return (
      <Image
        source={{ uri: url }}
        style={shape}
        contentFit="cover"
        transition={150}
        onError={() => setFailedUrl(url)}
      />
    );
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
