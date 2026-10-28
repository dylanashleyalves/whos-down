import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing, withAlpha } from '@/constants/theme';

type EmptyStateProps = {
  emoji: string;
  title: string;
  text: string;
  // The obvious next step, so an empty screen is never a dead end.
  action?: { label: string; onPress: () => void };
  color?: string;
};

export function EmptyState({ emoji, title, text, action, color = Brand.purple }: EmptyStateProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.18) }]}>
        <ThemedText style={styles.emoji}>{emoji}</ThemedText>
      </View>
      <ThemedText type="smallBold" style={styles.center}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {text}
      </ThemedText>
      {action && (
        <View style={styles.action}>
          <PrimaryButton label={action.label} onPress={action.onPress} />
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  emoji: {
    fontSize: 36,
    lineHeight: 44,
  },
  center: {
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
});
