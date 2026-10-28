import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, withAlpha } from '@/constants/theme';

type PillProps = {
  color: string;
  label: string;
  bold?: boolean;
  size?: 'small' | 'medium';
};

// A rounded label tinted in a colour, e.g. a category or "3 spots left".
export function Pill({ color, label, bold, size = 'small' }: PillProps) {
  return (
    <View
      style={[
        styles.pill,
        size === 'medium' && styles.medium,
        { backgroundColor: withAlpha(color, 0.16) },
      ]}>
      <ThemedText
        type={bold ? 'smallBold' : 'small'}
        style={[size === 'small' && styles.smallText, { color }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
  },
  medium: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  smallText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
