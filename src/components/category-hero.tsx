import { StyleSheet, View } from 'react-native';

import { FloatingEmoji, Orb } from '@/components/art';
import { ThemedText } from '@/components/themed-text';
import { colorGradient, Spacing } from '@/constants/theme';
import { Categories, type Category } from '@/lib/activities';

// The illustrated banner at the top of an activity: the category's colours, soft lights
// and its emoji as a big tilted sticker.
export function CategoryHero({ category }: { category: Category }) {
  const { color, emoji, label } = Categories[category];
  return (
    <View style={[styles.hero, { backgroundImage: colorGradient(color), backgroundColor: color }]}>
      <Orb size={260} color="#ffffff38" at={{ top: -120, left: -70 }} />
      <Orb size={200} color="#00000030" at={{ bottom: -110, right: 40 }} />
      <FloatingEmoji emoji="✨" size={24} rotate={0} at={{ top: 22, right: 140 }} />
      <FloatingEmoji
        emoji="✨"
        size={16}
        rotate={0}
        opacity={0.8}
        at={{ bottom: 30, right: 150 }}
      />
      <View style={styles.sticker}>
        <ThemedText style={styles.emoji}>{emoji}</ThemedText>
      </View>
      <ThemedText type="smallBold" style={styles.label}>
        {label.toUpperCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 150,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: Spacing.four,
  },
  sticker: {
    position: 'absolute',
    right: Spacing.four,
    top: 22,
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#ffffff2e',
    borderWidth: 3,
    borderColor: '#ffffffaa',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-10deg' }],
  },
  emoji: {
    fontSize: 58,
    lineHeight: 70,
  },
  label: {
    color: '#ffffff',
    letterSpacing: 2,
  },
});
