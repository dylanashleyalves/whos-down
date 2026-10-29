import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { ProfileChecklist } from '@/components/profile-checklist';
import { AvatarRing } from '@/components/avatar-ring';
import { Pill } from '@/components/pill';
import { KudosPills } from '@/components/kudos-pills';
import { ProfileCover } from '@/components/profile-cover';
import { PrimaryButton } from '@/components/primary-button';
import { RankCard } from '@/components/rank-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Brand, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { Categories } from '@/lib/activities';
import { formatCountry } from '@/lib/countries';
import { displayName, type Profile } from '@/lib/profiles';
import {
  daysSince,
  fetchCrewFriendships,
  fetchUserStats,
  friendshipLevel,
  type CrewFriendship,
  type UserStats,
} from '@/lib/ranks';
import { shareProfile } from '@/lib/share';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

// Suggest meeting a crew member again after this long apart.
const NUDGE_AFTER_DAYS = 21;

export default function ProfileScreen() {
  const { session, profile, isAdmin } = useAuth();
  const [crew, setCrew] = useState<Profile[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [friendships, setFriendships] = useState<Map<string, CrewFriendship>>(new Map());

  const load = useCallback(async () => {
    const userId = session?.user.id ?? '';
    const [connections, myStats, crewFriendships] = await Promise.all([
      supabase.rpc('my_connections'),
      fetchUserStats(userId),
      fetchCrewFriendships(),
    ]);
    setStats(myStats);
    setFriendships(crewFriendships);
    setCrew((connections.data as Profile[]) ?? []);
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={8}
              accessibilityLabel="Settings"
              style={({ pressed }) => [styles.gear, pressed && styles.pressed]}>
              <ThemedText style={styles.gearIcon}>⚙️</ThemedText>
            </Pressable>
            <ProfileCover bio={profile?.bio} interests={profile?.interests}>
              <AvatarRing profile={profile} size={88} />
            </ProfileCover>
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
                <Pill
                  key={key}
                  size="medium"
                  color={Categories[key]?.color ?? Brand.blue}
                  label={`${Categories[key]?.emoji ?? ''} ${Categories[key]?.label ?? key}`}
                />
              ))}
            </View>
          )}

          {session && <KudosPills userId={session.user.id} />}

          {profile && <ProfileChecklist profile={profile} />}

          {stats && <RankCard stats={stats} />}

          {profile && (
            <PrimaryButton
              label="📤 Share my profile"
              onPress={() => shareProfile(profile, stats?.xp_recent ?? null, true)}
            />
          )}

          <PrimaryButton
            label="Edit profile"
            variant="secondary"
            onPress={() => router.push('/edit-profile')}
          />

          {isAdmin && <PrimaryButton label="🛡️ Moderation" onPress={() => router.push('/admin')} />}

          <ThemedText type="smallBold">Your crew ({crew.length})</ThemedText>
          {crew.length === 0 ? (
            <EmptyState
              emoji="🤝"
              color="#22C55E"
              title="Your crew is empty, for now"
              text={
                'After a meetup, tap "Hang again?" on the people you’d see again. When they pick you too, they join your crew and you can message them.'
              }
              action={{ label: 'Find an activity', onPress: () => router.navigate('/') }}
            />
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
  // Over the top-right corner of the cover.
  gear: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00000059',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearIcon: {
    fontSize: 20,
    lineHeight: 26,
  },
  pressed: {
    opacity: 0.6,
  },
});
