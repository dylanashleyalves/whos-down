import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { CategoryHero } from '@/components/category-hero';
import { CheckInCard } from '@/components/check-in-card';
import { Chip } from '@/components/chip';
import { Pill } from '@/components/pill';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  Audiences,
  Categories,
  fetchActivity,
  formatDay,
  formatTime,
  directionsUrl,
  hasStarted,
  spotsLeft,
  type ActivityWithPeople,
} from '@/lib/activities';
import { confirmAction } from '@/lib/confirm';
import { findCountry } from '@/lib/countries';
import { canGiveKudos, fetchMyKudos, KUDOS, setKudo, type Kudo } from '@/lib/kudos';
import { displayName, type ProfileSummary } from '@/lib/profiles';
import { shareActivity } from '@/lib/share';
import { showToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const myId = session?.user.id;

  const [activity, setActivity] = useState<ActivityWithPeople | null>(null);
  // People I've said I'd hang out with again.
  const [hangAgain, setHangAgain] = useState<Set<string>>(new Set());
  // Tags I've given each person here, and whose tag picker is open.
  const [kudos, setKudos] = useState<Map<string, Set<Kudo>>>(new Map());
  const [kudosFor, setKudosFor] = useState<string | null>(null);
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
        if (hasStarted(loaded)) setKudos(await fetchMyKudos(loaded.id));
      }
    } catch (e) {
      // Usually opened from a shared link: it's been deleted, or the database hides it
      // (another country, a guys- or girls-only activity, or a blocked host).
      console.warn('Could not load activity', e);
      setError(
        "This activity isn't available. It may have been deleted, or it's for a different group or country."
      );
    }
  }, [id, myId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Runs a join/leave/hang-again change, then reloads to show the result.
  async function update(
    change: () => PromiseLike<{ error: { message: string } | null }>,
    // Shown as a pop-up when it works.
    success?: string
  ) {
    setBusy(true);
    const { error } = await change();
    if (error) setError(error.message);
    else if (success) showToast(success);
    await load();
    setBusy(false);
  }

  async function remove() {
    const ok = await confirmAction(
      'Delete this activity?',
      'Everyone who joined will lose it, along with the group chat. This can’t be undone.',
      'Delete'
    );
    if (!ok) return;

    setBusy(true);
    const { error } = await supabase.from('activities').delete().eq('id', id);
    setBusy(false);
    if (error) setError(error.message);
    else router.back();
  }

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

  function openDirections() {
    if (!activity) return;
    const country = findCountry(profile?.country)?.name;
    Linking.openURL(directionsUrl(activity.location, country));
  }

  const startsAt = new Date(activity.starts_at);
  const category = Categories[activity.category];
  const isHost = activity.host_id === myId;
  const isMember = activity.members.some((m) => m.user_id === myId);
  const isParticipant = isHost || isMember;
  const started = hasStarted(activity);
  const left = spotsLeft(activity);
  const kudosOpen = canGiveKudos(activity.starts_at);

  const people: {
    profile: ProfileSummary | null;
    userId: string;
    isHost: boolean;
  }[] = [
    { profile: activity.host, userId: activity.host_id, isHost: true },
    ...activity.members.map((m) => ({
      profile: m.profile,
      userId: m.user_id,
      isHost: false,
    })),
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView type="backgroundElement" style={[styles.card, { shadowColor: category.color }]}>
          <View style={styles.hero}>
            <CategoryHero category={activity.category} />
          </View>
          {activity.audience !== 'everyone' && (
            <View style={styles.pills}>
              <Pill
                color={activity.audience === 'girls' ? Brand.pink : Brand.blue}
                label={`${Audiences[activity.audience].emoji} ${Audiences[activity.audience].label}`}
              />
            </View>
          )}
          <ThemedText type="subtitle" style={styles.title}>
            {activity.title}
          </ThemedText>
          <ThemedText>
            🕒 {formatDay(startsAt)} · {formatTime(startsAt)}
          </ThemedText>
          <Pressable
            onPress={openDirections}
            accessibilityRole="link"
            accessibilityLabel={`Get directions to ${activity.location}`}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText>📍 {activity.location}</ThemedText>
            <ThemedText type="linkPrimary">🗺️ Get directions</ThemedText>
          </Pressable>
          {activity.details && (
            <ThemedText type="small" themeColor="textSecondary">
              {activity.details}
            </ThemedText>
          )}
          <View style={styles.hostRow}>
            <Avatar profile={activity.host} size={28} />
            <ThemedText type="small">
              Hosted by {isHost ? 'you' : displayName(activity.host)}
            </ThemedText>
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
              update(
                () => supabase.from('activity_members').insert({ activity_id: activity.id }),
                "You're in! 🎉 Say hi in the group chat"
              );
            }}
          />
        )}

        {isParticipant && (
          <PrimaryButton
            label="💬 Open group chat"
            onPress={() => router.push(`/chat/${activity.id}`)}
          />
        )}

        <PrimaryButton
          label={isHost ? '📤 Invite friends' : '📤 Share activity'}
          variant="secondary"
          onPress={() => shareActivity(activity)}
        />

        {!started && isMember && (
          <PrimaryButton
            label="Leave"
            variant="secondary"
            busy={busy}
            onPress={() =>
              update(
                () =>
                  supabase
                    .from('activity_members')
                    .delete()
                    .eq('activity_id', activity.id)
                    .eq('user_id', myId ?? ''),
                'You left this activity'
              )
            }
          />
        )}

        {started && isParticipant && <CheckInCard activity={activity} myId={myId} onSaved={load} />}

        <ThemedText type="smallBold">Who&apos;s going ({people.length})</ThemedText>
        <View style={styles.people}>
          {people.map(({ profile, userId, isHost: hosting }) => {
            const canAsk = started && isParticipant && userId !== myId;
            const asked = hangAgain.has(userId);
            const given = kudos.get(userId) ?? new Set<Kudo>();
            const picking = kudosFor === userId;
            return (
              <View key={userId} style={styles.personBlock}>
                <View style={styles.person}>
                  <Pressable
                    onPress={() => router.push(`/user/${userId}`)}
                    style={({ pressed }) => [styles.personTap, pressed && styles.pressed]}>
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
                  </Pressable>
                  {canAsk && kudosOpen && (
                    <Pressable
                      onPress={() => setKudosFor(picking ? null : userId)}
                      accessibilityLabel={`Give ${displayName(profile)} kudos`}
                      style={({ pressed }) => pressed && styles.pressed}>
                      <ThemedView
                        type={
                          picking || given.size > 0 ? 'backgroundSelected' : 'backgroundElement'
                        }
                        style={styles.hangButton}>
                        <ThemedText type="small">
                          👏{given.size > 0 ? ` ${given.size}` : ''}
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  )}
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
                        <ThemedText type="small">
                          {asked ? '✓ Down again' : 'Hang again?'}
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  )}
                </View>
                {picking && (
                  <View style={styles.kudos}>
                    {(Object.keys(KUDOS) as Kudo[]).map((tag) => (
                      <Chip
                        key={tag}
                        label={`${KUDOS[tag].emoji} ${KUDOS[tag].label}`}
                        color={KUDOS[tag].color}
                        selected={given.has(tag)}
                        onPress={() =>
                          !busy &&
                          update(
                            () => setKudo(activity.id, userId, tag, !given.has(tag)),
                            given.has(tag) ? undefined : `${KUDOS[tag].emoji} Kudos sent`
                          )
                        }
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {started && isParticipant && people.length > 1 && (
          <ThemedText type="small" themeColor="textSecondary">
            Tap &quot;Hang again?&quot; for anyone you&apos;d meet up with again. They only find out
            if they pick you too, and then you&apos;re in each other&apos;s crew.
            {kudosOpen &&
              ' Tap 👏 to say what was great about someone. They get a notification from you, and their profile adds it to their count.'}
          </ThemedText>
        )}

        {isHost ? (
          <>
            {!started && (
              <PrimaryButton
                label="Edit activity"
                variant="secondary"
                onPress={() => router.push(`/edit-activity/${activity.id}`)}
              />
            )}
            <PrimaryButton
              label="Delete activity"
              variant="secondary"
              busy={busy}
              onPress={remove}
            />
          </>
        ) : (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/report',
                params: { activityId: activity.id },
              })
            }
            style={styles.reportLink}>
            <ThemedText type="small" themeColor="textSecondary">
              Report this activity
            </ThemedText>
          </Pressable>
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
    overflow: 'hidden',
    // A soft glow in the category's colour.
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  // Edge to edge across the top of the card.
  hero: {
    marginTop: -Spacing.four,
    marginHorizontal: -Spacing.four,
    marginBottom: Spacing.two,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  personBlock: {
    gap: Spacing.two,
  },
  kudos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  personTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  personText: {
    flex: 1,
  },
  reportLink: {
    alignSelf: 'center',
    padding: Spacing.three,
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
