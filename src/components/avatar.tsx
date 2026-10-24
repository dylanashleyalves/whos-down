import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { ProfileSummary } from '@/lib/profiles';

// Backgrounds for people without a photo. White text reads well on all of them.
const COLORS = ['#3c87f7', '#e5484d', '#30a46c', '#f76b15', '#8e4ec6', '#0d9488', '#d6409f'];

// The same name always gets the same colour.
function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

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

  const name = profile?.display_name?.trim() ?? '';
  const initial = name.charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.fallback, shape, { backgroundColor: colorFor(name) }]}>
      <ThemedText
        type="smallBold"
        style={[styles.initial, { fontSize: size * 0.4, lineHeight: size * 0.5 }]}>
        {initial}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#ffffff',
  },
});
