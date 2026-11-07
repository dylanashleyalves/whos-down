import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Pill } from '@/components/pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { fetchKudos, KUDOS, type KudoCount } from '@/lib/kudos';

type KudosPillsProps = {
  userId?: string;
  // Sample data instead of loading, for the demo screens.
  kudos?: KudoCount[];
};

// "What people think": the tags someone has been given after meetups. Hidden until they have any.
export function KudosPills({ userId, kudos }: KudosPillsProps) {
  const [loaded, setLoaded] = useState<KudoCount[]>([]);

  useEffect(() => {
    if (kudos || !userId) return;
    fetchKudos(userId).then(setLoaded);
  }, [userId, kudos]);

  const shown = kudos ?? loaded;
  if (shown.length === 0) return null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">What people think</ThemedText>
      <View style={styles.pills}>
        {shown.map(({ tag, total }) => (
          <Pill
            key={tag}
            color={KUDOS[tag].color}
            label={`${KUDOS[tag].emoji} ${KUDOS[tag].label} ×${total}`}
          />
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
});
