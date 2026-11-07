import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ActivityForm } from '@/components/activity-form';
import { ThemedView } from '@/components/themed-view';
import { fetchIdea, type IdeaWithPeople } from '@/lib/ideas';

// "?idea=<id>" comes from "Host it" on an idea: the form starts filled in from it.
export default function NewActivityScreen() {
  const { idea: ideaId } = useLocalSearchParams<{ idea?: string }>();
  const [idea, setIdea] = useState<IdeaWithPeople | null | undefined>(ideaId ? undefined : null);

  useEffect(() => {
    if (!ideaId) return;
    fetchIdea(ideaId).then(setIdea, () => setIdea(null));
  }, [ideaId]);

  if (idea === undefined) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }
  return <ActivityForm fromIdea={idea ?? undefined} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
