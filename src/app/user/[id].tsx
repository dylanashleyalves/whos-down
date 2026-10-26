import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PrimaryButton } from '@/components/primary-button';
import { RankCard } from '@/components/rank-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Categories } from '@/lib/activities';
import { confirmAction } from '@/lib/confirm';
import { formatCountry } from '@/lib/countries';
import { canMessage } from '@/lib/dms';
import { displayName, type Profile } from '@/lib/profiles';
import { fetchUserStats, type UserStats } from '@/lib/ranks';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const myId = session?.user.id;
  const isMe = id === myId;

  const [person, setPerson] = useState<Profile | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  // Crew members can message each other.
  const [inCrew, setInCrew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [profile, block, theirStats, crew] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('blocks').select('blocked_id').eq('blocker_id', myId ?? '').eq('blocked_id', id),
      fetchUserStats(id),
      myId && myId !== id ? canMessage(myId, id) : Promise.resolve(false),
    ]);
    if (profile.error) setError(profile.error.message);
    setPerson(profile.data as Profile | null);
    setBlocked((block.data ?? []).length > 0);
    setStats(theirStats);
    setInCrew(crew);
  }, [id, myId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function toggleBlock() {
    const name = displayName(person);
    if (!blocked) {
      const ok = await confirmAction(
        `Block ${name}?`,
        "You won't see each other's activities or chat messages, and they can't join your activities. They won't be told.",
        'Block'
      );
      if (!ok) return;
    }

    setBusy(true);
    const { error } = blocked
      ? await supabase.from('blocks').delete().eq('blocker_id', myId ?? '').eq('blocked_id', id)
      : await supabase.from('blocks').insert({ blocked_id: id });
    setBusy(false);

    if (error) {
      setError(error.message);
    } else if (!blocked) {
      router.back();
    } else {
      setBlocked(false);
    }
  }

  if (!person) {
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

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar profile={person} size={96} />
          <ThemedText type="subtitle">{displayName(person)}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {[person.city && `📍 ${person.city}`, formatCountry(person.country)]
              .filter(Boolean)
              .join(' · ')}
          </ThemedText>
        </View>

        {person.bio && <ThemedText style={styles.center}>{person.bio}</ThemedText>}

        {person.interests.length > 0 && (
          <View style={styles.interests}>
            {person.interests.map((key) => (
              <ThemedView key={key} type="backgroundElement" style={styles.interest}>
                <ThemedText type="small">
                  {Categories[key]?.emoji} {Categories[key]?.label ?? key}
                </ThemedText>
              </ThemedView>
            ))}
          </View>
        )}

        {stats && <RankCard stats={stats} />}

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        {!isMe && (
          <View style={styles.actions}>
            {inCrew && (
              <PrimaryButton label="💬 Message" onPress={() => router.push(`/dm/${id}`)} />
            )}
            <PrimaryButton
              label="Report"
              variant="secondary"
              onPress={() => router.push({ pathname: '/report', params: { userId: id } })}
            />
            <PrimaryButton
              label={blocked ? 'Unblock' : 'Block'}
              variant="secondary"
              busy={busy}
              onPress={toggleBlock}
            />
          </View>
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
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  interest: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  error: {
    color: '#e5484d',
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
});
