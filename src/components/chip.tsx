import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing, withAlpha } from '@/constants/theme';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  // Optional accent, e.g. a category's colour. Without one, selected chips use the brand gradient.
  color?: string;
};

export function Chip({ label, selected, onPress, color }: ChipProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {selected ? (
        <View
          style={[
            styles.chip,
            color
              ? { backgroundColor: color }
              : { backgroundColor: Brand.blue, backgroundImage: Brand.gradient },
          ]}>
          <ThemedText type="smallBold" style={styles.selectedText}>
            {label}
          </ThemedText>
        </View>
      ) : color ? (
        <View style={[styles.chip, { backgroundColor: withAlpha(color, 0.14) }]}>
          <ThemedText type="small" style={{ color }}>
            {label}
          </ThemedText>
        </View>
      ) : (
        <ThemedView type="backgroundElement" style={styles.chip}>
          <ThemedText type="small" themeColor="textSecondary">
            {label}
          </ThemedText>
        </ThemedView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  selectedText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
});
