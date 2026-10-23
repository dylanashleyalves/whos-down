import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ActivityForm } from '@/components/activity-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchActivity, type ActivityWithPeople } from '@/lib/activities';

export default function EditActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activity, setActivity] = useState<ActivityWithPeople | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivity(id).then(setActivity, (e: Error) => setError(e.message));
  }, [id]);

  if (!activity) {
    return (
      <ThemedView style={styles.centered}>
        {error ? (
          <ThemedText themeColor="textSecondary">{error}</ThemedText>
        ) : (
          <ActivityIndicator size="large" />
        )}
      </ThemedView>
    );
  }

  return <ActivityForm existing={activity} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
