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
};

export function PrimaryButton({ label, onPress, busy, dimmed, variant = 'primary' }: ButtonProps) {
  const content = busy ? (
    <ActivityIndicator color={variant === 'primary' ? '#ffffff' : undefined} />
  ) : (
    <ThemedText type="smallBold" style={variant === 'primary' && styles.primaryLabel}>
      {label}
    </ThemedText>
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
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: Brand.blue,
    backgroundImage: Brand.gradient,
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
