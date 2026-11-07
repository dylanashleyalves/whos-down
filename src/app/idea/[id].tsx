import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { IdeaCard } from '@/components/idea-card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { confirmAction } from '@/lib/confirm';
import {
  daysLeft,
  fetchIdea,
  IDEA_READY_AT,
  isDown,
  peopleDown,
  setDown,
  type IdeaWithPeople,
} from '@/lib/ideas';
import { displayName } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/lib/toast';
import { useAuth } from '@/providers/auth-provider';

export default function IdeaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const myId = session?.user.id;
  const [idea, setIdea] = useState<IdeaWithPeople | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIdea(await fetchIdea(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this idea.');
      setIdea(null);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (idea === undefined) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (idea === null) {
    return (
      <ThemedView style={styles.center}>
        <EmptyState
          emoji="💨"
          title="This idea is gone"
          text={error ?? 'It may have been deleted, or it ended after 14 days.'}
          action={{ label: 'Back to Discover', onPress: () => router.navigate('/') }}
        />
      </ThemedView>
    );
  }

  const current = idea;
  const mine = current.user_id === myId;
  const down = isDown(current, myId);
  const people = peopleDown(current);
  const hosted = !!current.activity_id;
  const ended = !hosted && daysLeft(current) === 0;
  const needed = Math.max(IDEA_READY_AT - people.length, 0);

  async function toggleDown() {
    setBusy(true);
    setError(null);
    try {
      await setDown(current.id, !down);
      if (!down) showToast("🙌 You're down! We'll let you know when it's on");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
    setBusy(false);
  }

  async function remove() {
    const ok = await confirmAction(
      'Delete this idea?',
      'It disappears for everyone who said they were down.',
      'Delete'
    );
    if (!ok) return;
    const { error } = await supabase.from('ideas').delete().eq('id', current.id);
    if (error) {
      setError(error.message);
      return;
    }
    showToast('Idea deleted');
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <IdeaCard idea={current} myId={myId} onPress={null} />

        {hosted ? (
          <ThemedView type="backgroundElement" style={styles.status}>
            <ThemedText type="smallBold">🎉 It&apos;s on! Someone is hosting this.</ThemedText>
            <PrimaryButton
              label="See the activity"
              onPress={() => router.push(`/activity/${current.activity_id}`)}
            />
          </ThemedView>
        ) : ended ? (
          <ThemedView type="backgroundElement" style={styles.status}>
            <ThemedText type="small">⌛ This idea ended without a host.</ThemedText>
          </ThemedView>
        ) : (
          <>
            <ThemedView type="backgroundElement" style={styles.status}>
              <ThemedText type="smallBold">
                {needed > 0
                  ? `🙌 ${needed} more ${needed === 1 ? 'person' : 'people'} and everyone gets told it's time to plan`
                  : '🔥 Enough people are down. Someone just needs to host it!'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Whoever hosts picks the time and place, and everyone below is invited.
                {` Ends in ${daysLeft(current)} ${daysLeft(current) === 1 ? 'day' : 'days'} if nobody does.`}
              </ThemedText>
            </ThemedView>

            {error && (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            )}

            <View style={styles.actions}>
              {!mine && (
                <View style={styles.grow}>
                  <PrimaryButton
                    label={down ? "You're down ✓" : "🙌 I'm down too"}
                    variant={down ? 'secondary' : 'primary'}
                    busy={busy}
                    onPress={toggleDown}
                  />
                </View>
              )}
              <View style={styles.grow}>
                <PrimaryButton
                  label="📅 Host it"
                  variant={mine || down ? 'primary' : 'secondary'}
                  onPress={() =>
                    router.push({ pathname: '/new-activity', params: { idea: current.id } })
                  }
                />
              </View>
            </View>
          </>
        )}

        <ThemedText type="smallBold">Who&apos;s down ({people.length})</ThemedText>
        {people.map((person) => (
          <Pressable
            key={person.id}
            onPress={() => router.push(`/user/${person.id}`)}
            style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
            <Avatar profile={person} size={36} />
            <ThemedText type="small" style={styles.grow}>
              {person.id === myId ? 'You' : displayName(person)}
              {person.id === current.user_id && (
                <ThemedText type="small" themeColor="textSecondary">
                  {'  ·  💡 Their idea'}
                </ThemedText>
              )}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ›
            </ThemedText>
          </Pressable>
        ))}

        <View style={styles.links}>
          {mine ? (
            <Pressable onPress={remove} hitSlop={6}>
              <ThemedText type="small" style={styles.error}>
                Delete idea
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/report', params: { userId: current.user_id } })
              }
              hitSlop={6}>
              <ThemedText type="small" themeColor="textSecondary">
                Report
              </ThemedText>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  status: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    borderLeftWidth: 4,
    borderLeftColor: Brand.purple,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
  },
  error: {
    color: '#e5484d',
  },
  pressed: {
    opacity: 0.6,
  },
});
