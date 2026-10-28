import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type OrbProps = {
  size: number;
  color: string;
  // Where it sits inside its (overflow: hidden) parent, e.g. { top: -40, right: -30 }.
  at: Pick<ViewStyle, 'top' | 'right' | 'bottom' | 'left'>;
};

// A soft glowing circle that fades out at the edges. Purely decorative.
export function Orb({ size, color, at }: OrbProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.absolute,
        at,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundImage: `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 70%)`,
        },
      ]}
    />
  );
}

type FloatingEmojiProps = {
  emoji: string;
  size: number;
  rotate: number;
  opacity?: number;
  at: Pick<ViewStyle, 'top' | 'right' | 'bottom' | 'left'>;
};

// A big tilted emoji used as artwork in the background of a card.
export function FloatingEmoji({ emoji, size, rotate, opacity = 1, at }: FloatingEmojiProps) {
  return (
    <ThemedText
      pointerEvents="none"
      style={[
        styles.absolute,
        at,
        {
          fontSize: size,
          lineHeight: size * 1.2,
          opacity,
          transform: [{ rotate: `${rotate}deg` }],
        },
      ]}>
      {emoji}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
  },
});

// Two big soft lights behind the top of a screen, so it isn't a flat background.
export function BackdropGlow() {
  return (
    <>
      <Orb size={440} color="#8B5CF655" at={{ top: -190, left: -150 }} />
      <Orb size={380} color="#3C87F744" at={{ top: -150, right: -170 }} />
    </>
  );
}
