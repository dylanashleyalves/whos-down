import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Pill } from '@/components/pill';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { fetchKudos, KUDOS, type KudoCount } from '@/lib/kudos';

type KudosPillsProps = {
  userId?: string;
  // Sample data instead of loading, for the demo screens.
  kudos?: KudoCount[];
};

// "What people say": the tags someone has been given after meetups. Hidden until they have any.
export function KudosPills({ userId, kudos }: KudosPillsProps) {
  const [loaded, setLoaded] = useState<KudoCount[]>([]);

  useEffect(() => {
    if (kudos || !userId) return;
    fetchKudos(userId).then(setLoaded);
  }, [userId, kudos]);

  const shown = kudos ?? loaded;
  if (shown.length === 0) return null;

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">What people say</ThemedText>
      <View style={styles.pills}>
        {shown.map(({ tag, total }) => (
          <Pill
            key={tag}
            size="medium"
            color={KUDOS[tag].color}
            label={`${KUDOS[tag].emoji} ${KUDOS[tag].label} ×${total}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
