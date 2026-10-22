import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  Categories,
  fetchActivity,
  formatDay,
  formatTime,
  hasStarted,
  spotsLeft,
  type ActivityWithPeople,
} from '@/lib/activities';
import { displayName, type ProfileSummary } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const myId = session?.user.id;

  const [activity, setActivity] = useState<ActivityWithPeople | null>(null);
  // People I've said I'd hang out with again.
  const [hangAgain, setHangAgain] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const loaded = await fetchActivity(id);
      setActivity(loaded);
      setError(null);

      const others = [loaded.host_id, ...loaded.members.map((m) => m.user_id)].filter(
        (userId) => userId !== myId
      );
      if (myId && others.length > 0) {
        const { data } = await supabase
          .from('hang_again')
          .select('to_user')
          .eq('from_user', myId)
          .in('to_user', others);
        setHangAgain(new Set((data ?? []).map((row) => row.to_user as string)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this activity.');
    }
  }, [id, myId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Runs a join/leave/hang-again change, then reloads to show the result.
  async function update(change: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    const { error } = await change();
    if (error) setError(error.message);
    await load();
    setBusy(false);
  }

  if (!activity) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">{error ?? 'Loading…'}</ThemedText>
      </ThemedView>
    );
  }

  const startsAt = new Date(activity.starts_at);
  const category = Categories[activity.category];
  const isHost = activity.host_id === myId;
  const isMember = activity.members.some((m) => m.user_id === myId);
  const isParticipant = isHost || isMember;
  const started = hasStarted(activity);
  const left = spotsLeft(activity);

  const people: { profile: ProfileSummary | null; userId: string; isHost: boolean }[] = [
    { profile: activity.host, userId: activity.host_id, isHost: true },
    ...activity.members.map((m) => ({ profile: m.profile, userId: m.user_id, isHost: false })),
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="small" themeColor="textSecondary">
            {category.emoji} {category.label}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.title}>
            {activity.title}
          </ThemedText>
          <ThemedText>
            🕒 {formatDay(startsAt)} · {formatTime(startsAt)}
          </ThemedText>
          <ThemedText>📍 {activity.location}</ThemedText>
          {activity.details && (
            <ThemedText type="small" themeColor="textSecondary">
              {activity.details}
            </ThemedText>
          )}
          <View style={styles.hostRow}>
            <Avatar profile={activity.host} size={28} />
            <ThemedText type="small">Hosted by {isHost ? 'you' : displayName(activity.host)}</ThemedText>
          </View>
        </ThemedView>

        <ThemedText type="smallBold" themeColor="textSecondary">
          {started
            ? 'This activity has started'
            : left === 0
              ? 'Full'
              : `${left} of ${activity.spots} ${activity.spots === 1 ? 'spot' : 'spots'} left`}
        </ThemedText>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        {!started && !isParticipant && (
          <PrimaryButton
            label={left === 0 ? 'Full' : "I'm down"}
            busy={busy}
            dimmed={left === 0}
            onPress={() => {
              if (left === 0) return;
              update(() => supabase.from('activity_members').insert({ activity_id: activity.id }));
            }}
          />
        )}

        {isParticipant && (
          <PrimaryButton label="💬 Open group chat" onPress={() => router.push(`/chat/${activity.id}`)} />
        )}

        {!started && isMember && (
          <PrimaryButton
            label="Leave"
            variant="secondary"
            busy={busy}
            onPress={() =>
              update(() =>
                supabase
                  .from('activity_members')
                  .delete()
                  .eq('activity_id', activity.id)
                  .eq('user_id', myId ?? '')
              )
            }
          />
        )}

        <ThemedText type="smallBold">Who&apos;s going ({people.length})</ThemedText>
        <View style={styles.people}>
          {people.map(({ profile, userId, isHost: hosting }) => {
            const canAsk = started && isParticipant && userId !== myId;
            const asked = hangAgain.has(userId);
            return (
              <View key={userId} style={styles.person}>
                <Avatar profile={profile} />
                <View style={styles.personText}>
                  <ThemedText type="smallBold">
                    {displayName(profile)}
                    {userId === myId ? ' (you)' : ''}
                  </ThemedText>
                  {hosting && (
                    <ThemedText type="small" themeColor="textSecondary">
                      Host
                    </ThemedText>
                  )}
                </View>
                {canAsk && (
                  <Pressable
                    disabled={busy}
                    onPress={() =>
                      update(() =>
                        asked
                          ? supabase
                              .from('hang_again')
                              .delete()
                              .eq('from_user', myId ?? '')
                              .eq('to_user', userId)
                          : supabase.from('hang_again').insert({ to_user: userId })
                      )
                    }
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedView
                      type={asked ? 'backgroundSelected' : 'backgroundElement'}
                      style={styles.hangButton}>
                      <ThemedText type="small">{asked ? '✓ Down again' : 'Hang again?'}</ThemedText>
                    </ThemedView>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {started && isParticipant && people.length > 1 && (
          <ThemedText type="small" themeColor="textSecondary">
            Tap &quot;Hang again?&quot; for anyone you&apos;d meet up with again. They only find out
            if they pick you too, and then you&apos;re in each other&apos;s crew.
          </ThemedText>
        )}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  error: {
    color: '#e5484d',
  },
  people: {
    gap: Spacing.three,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  personText: {
    flex: 1,
  },
  hangButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
