import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { PrimaryButton } from '@/components/primary-button';
import { RankCard } from '@/components/rank-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { Categories } from '@/lib/activities';
import { formatCountry } from '@/lib/countries';
import {
  displayName,
  maskEmail,
  PROFILE_SUMMARY,
  type Profile,
  type ProfileSummary,
} from '@/lib/profiles';
import {
  daysSince,
  fetchCrewFriendships,
  fetchUserStats,
  friendshipLevel,
  type CrewFriendship,
  type UserStats,
} from '@/lib/ranks';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

// Suggest meeting a crew member again after this long apart.
const NUDGE_AFTER_DAYS = 21;

export default function ProfileScreen() {
  const { session, profile, isAdmin } = useAuth();
  const [crew, setCrew] = useState<Profile[]>([]);
  const [blocked, setBlocked] = useState<ProfileSummary[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [friendships, setFriendships] = useState<Map<string, CrewFriendship>>(new Map());

  const load = useCallback(async () => {
    const userId = session?.user.id ?? '';
    const [connections, blocks, myStats, crewFriendships] = await Promise.all([
      supabase.rpc('my_connections'),
      supabase
        .from('blocks')
        .select(`blocked:profiles!blocks_blocked_id_fkey(${PROFILE_SUMMARY})`)
        .eq('blocker_id', userId),
      fetchUserStats(userId),
      fetchCrewFriendships(),
    ]);
    setStats(myStats);
    setFriendships(crewFriendships);
    setCrew((connections.data as Profile[]) ?? []);
    const rows = (blocks.data ?? []) as unknown as { blocked: ProfileSummary | null }[];
    setBlocked(rows.flatMap((row) => (row.blocked ? [row.blocked] : [])));
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function unblock(id: string) {
    await supabase.from('blocks').delete().eq('blocker_id', session?.user.id ?? '').eq('blocked_id', id);
    load();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Avatar profile={profile} size={88} />
            <ThemedText type="subtitle">{displayName(profile)}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {[profile?.city && `📍 ${profile.city}`, formatCountry(profile?.country)]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
          </View>

          {profile?.bio && <ThemedText style={styles.bio}>{profile.bio}</ThemedText>}

          {profile && profile.interests.length > 0 && (
            <View style={styles.interests}>
              {profile.interests.map((key) => (
                <ThemedView key={key} type="backgroundElement" style={styles.interest}>
                  <ThemedText type="small">
                    {Categories[key]?.emoji} {Categories[key]?.label ?? key}
                  </ThemedText>
                </ThemedView>
              ))}
            </View>
          )}

          {stats && <RankCard stats={stats} />}

          <PrimaryButton
            label="Edit profile"
            variant="secondary"
            onPress={() => router.push('/edit-profile')}
          />

          {isAdmin && (
            <PrimaryButton label="🛡️ Moderation" onPress={() => router.push('/admin')} />
          )}

          <ThemedText type="smallBold">Your crew ({crew.length})</ThemedText>
          {crew.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                After an activity, tap &quot;Hang again?&quot; on the people you&apos;d meet up with again.
                When they pick you too, they show up here.
              </ThemedText>
            </ThemedView>
          ) : (
            crew.map((friend) => {
              const together = friendships.get(friend.id);
              const daysApart = together?.last_together ? daysSince(together.last_together) : null;
              return (
                <Pressable
                  key={friend.id}
                  onPress={() => router.push(`/user/${friend.id}`)}
                  style={styles.friend}>
                  <Avatar profile={friend} />
                  <View style={styles.grow}>
                    <ThemedText type="smallBold">{displayName(friend)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {friendshipLevel(together?.times_together ?? 0)}
                      {daysApart !== null &&
                        ` · ${daysApart === 0 ? 'hung out today' : `last hung out ${daysApart}d ago`}`}
                    </ThemedText>
                    {daysApart !== null && daysApart >= NUDGE_AFTER_DAYS && (
                      <ThemedText type="small" style={styles.nudge}>
                        It&apos;s been a while. Who&apos;s down? 👋
                      </ThemedText>
                    )}
                  </View>
                </Pressable>
              );
            })
          )}

          {blocked.length > 0 && (
            <>
              <ThemedText type="smallBold">Blocked ({blocked.length})</ThemedText>
              {blocked.map((person) => (
                <View key={person.id} style={styles.friend}>
                  <Avatar profile={person} />
                  <ThemedText type="smallBold" style={styles.grow}>
                    {displayName(person)}
                  </ThemedText>
                  <Pressable onPress={() => unblock(person.id)}>
                    <ThemedText type="linkPrimary">Unblock</ThemedText>
                  </Pressable>
                </View>
              ))}
            </>
          )}

          <Pressable onPress={() => router.push('/guidelines')} style={styles.link}>
            <ThemedText type="linkPrimary">Community guidelines</ThemedText>
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary" style={styles.email}>
            Signed in as {maskEmail(session?.user.email)}
          </ThemedText>
          <PrimaryButton
            label="Sign out"
            variant="secondary"
            onPress={() => supabase.auth.signOut()}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: TopTabInset + Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  bio: {
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
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  friend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  grow: {
    flex: 1,
  },
  nudge: {
    color: '#3c87f7',
  },
  link: {
    alignSelf: 'center',
    marginTop: Spacing.three,
  },
  email: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
});
