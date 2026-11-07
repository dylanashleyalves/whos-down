import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  busy?: boolean;
  // Looks faded but still tappable, so the screen can explain what's missing.
  dimmed?: boolean;
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;
};

export function PrimaryButton({
  label,
  onPress,
  busy,
  dimmed,
  variant = 'primary',
  icon,
}: ButtonProps) {
  const content = busy ? (
    <ActivityIndicator color={variant === 'primary' ? '#ffffff' : undefined} />
  ) : (
    <View style={styles.labelRow}>
      {icon}
      {/* "simple" stops Android from wrapping a short label that fits, like "📤 Share". */}
      <ThemedText
        type="smallBold"
        textBreakStrategy="simple"
        style={[styles.label, variant === 'primary' && styles.primaryLabel]}>
        {label}
      </ThemedText>
    </View>
  );

  return (
    <Pressable
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed, (dimmed || busy) && styles.dimmed]}>
      {variant === 'primary' ? (
        <View style={[styles.button, styles.primary]}>{content}</View>
      ) : (
        <ThemedView type="backgroundSelected" style={styles.button}>
          {content}
        </ThemedView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  primary: {
    backgroundColor: Brand.blue,
    backgroundImage: Brand.gradient,
  },
  label: {
    textAlign: 'center',
  },
  primaryLabel: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
  dimmed: {
    opacity: 0.5,
  },
});
