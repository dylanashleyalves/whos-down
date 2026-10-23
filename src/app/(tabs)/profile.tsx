import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { Categories } from '@/lib/activities';
import { formatCountry } from '@/lib/countries';
import { displayName, PROFILE_SUMMARY, type Profile, type ProfileSummary } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { session, profile } = useAuth();
  const [crew, setCrew] = useState<Profile[]>([]);
  const [blocked, setBlocked] = useState<ProfileSummary[]>([]);

  const load = useCallback(async () => {
    const [connections, blocks] = await Promise.all([
      supabase.rpc('my_connections'),
      supabase
        .from('blocks')
        .select(`blocked:profiles!blocks_blocked_id_fkey(${PROFILE_SUMMARY})`)
        .eq('blocker_id', session?.user.id ?? ''),
    ]);
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

          <PrimaryButton
            label="Edit profile"
            variant="secondary"
            onPress={() => router.push('/edit-profile')}
          />

          <ThemedText type="smallBold">Your crew ({crew.length})</ThemedText>
          {crew.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                After an activity, tap &quot;Hang again?&quot; on the people you&apos;d meet up with again.
                When they pick you too, they show up here.
              </ThemedText>
            </ThemedView>
          ) : (
            crew.map((friend) => (
              <Pressable
                key={friend.id}
                onPress={() => router.push(`/user/${friend.id}`)}
                style={styles.friend}>
                <Avatar profile={friend} />
                <View>
                  <ThemedText type="smallBold">{displayName(friend)}</ThemedText>
                  {friend.city && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {friend.city}
                    </ThemedText>
                  )}
                </View>
              </Pressable>
            ))
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
            Signed in as {session?.user.email}
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
  link: {
    alignSelf: 'center',
    marginTop: Spacing.three,
  },
  email: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
});
