import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { FloatingEmoji, Orb } from '@/components/art';
import { Brand, Spacing } from '@/constants/theme';
import { profileThemes } from '@/lib/bio-themes';

// Where the art is scattered across the cover, biggest first.
const SPOTS = [
  { at: { top: 14, left: 22 }, size: 42, rotate: -16 },
  { at: { top: 18, right: 26 }, size: 42, rotate: 12 },
  { at: { top: 72, left: 76 }, size: 30, rotate: 8 },
  { at: { top: 70, right: 88 }, size: 30, rotate: -10 },
  { at: { top: 10, left: 120 }, size: 24, rotate: 18 },
];

type ProfileCoverProps = {
  bio: string | null | undefined;
  interests: string[] | null | undefined;
  // The profile photo, which overlaps the bottom of the cover.
  children: ReactNode;
};

// A colourful banner at the top of a profile, themed on what the person says they like
// in their bio (e.g. "coffee" or "dogs") and the interests they picked.
export function ProfileCover({ bio, interests, children }: ProfileCoverProps) {
  const themes = profileThemes(bio, interests, SPOTS.length);
  const colors = themes.slice(0, 2).map((t) => t.color);
  const background =
    colors.length === 0
      ? Brand.sunset
      : `linear-gradient(135deg, ${[...colors, Brand.purple]
          .map((c, i, all) => `${c} ${Math.round((i / (all.length - 1)) * 100)}%`)
          .join(', ')})`;
  const emojis = themes.length > 0 ? themes.map((t) => t.emoji) : ['✨'];

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.cover,
          { backgroundColor: colors[0] ?? Brand.purple, backgroundImage: background },
        ]}>
        <Orb size={240} color="#ffffff3a" at={{ top: -120, left: 60 }} />
        <Orb size={200} color="#00000033" at={{ bottom: -110, right: -30 }} />
        {emojis.map((emoji, i) => (
          <FloatingEmoji key={emoji} emoji={emoji} {...SPOTS[i]} />
        ))}
      </View>
      <View style={styles.photo}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  cover: {
    alignSelf: 'stretch',
    height: 130,
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  photo: {
    marginTop: -56,
  },
});
