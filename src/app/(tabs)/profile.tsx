import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { Categories } from '@/lib/activities';
import { displayName, type Profile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { session, profile } = useAuth();
  const [crew, setCrew] = useState<Profile[]>([]);

  useFocusEffect(
    useCallback(() => {
      supabase.rpc('my_connections').then(({ data }) => setCrew((data as Profile[]) ?? []));
    }, [])
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Avatar profile={profile} size={88} />
            <ThemedText type="subtitle">{displayName(profile)}</ThemedText>
            {profile?.city && (
              <ThemedText themeColor="textSecondary">📍 {profile.city}</ThemedText>
            )}
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
              <View key={friend.id} style={styles.friend}>
                <Avatar profile={friend} />
                <View>
                  <ThemedText type="smallBold">{displayName(friend)}</ThemedText>
                  {friend.city && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {friend.city}
                    </ThemedText>
                  )}
                </View>
              </View>
            ))
          )}

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
  email: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
});
