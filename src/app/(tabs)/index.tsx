import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import {
  ACTIVITY_WITH_PEOPLE,
  Categories,
  formatDay,
  formatTime,
  spotsLeft,
  type ActivityWithPeople,
} from '@/lib/activities';
import { formatCountry } from '@/lib/countries';
import { displayName } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

// Keep activities that started up to 2 hours ago, so ongoing games still show.
const SHOW_PAST_MS = 2 * 60 * 60 * 1000;

export default function FeedScreen() {
  const { session, profile } = useAuth();
  const [activities, setActivities] = useState<ActivityWithPeople[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('activities')
      .select(ACTIVITY_WITH_PEOPLE)
      .gte('starts_at', new Date(Date.now() - SHOW_PAST_MS).toISOString())
      .order('starts_at', { ascending: true })
      .limit(100);

    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setActivities(data as unknown as ActivityWithPeople[]);
    }
  }, []);

  // Reload whenever the feed comes back into view, e.g. after posting.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Who&apos;s down?</ThemedText>
          <Pressable
            onPress={() => router.push('/new-activity')}
            style={({ pressed }) => pressed && styles.pressed}>
            <View style={styles.postButton}>
              <ThemedText type="smallBold" style={styles.postLabel}>
                + Post
              </ThemedText>
            </View>
          </Pressable>
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          Activities in {formatCountry(profile?.country) ?? 'your country'}
        </ThemedText>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          renderItem={({ item }) => <ActivityCard activity={item} myId={session?.user.id} />}
          ListEmptyComponent={
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">No activities yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Be the first. Tap &quot;+ Post&quot; to start a game, a gym session or a hangout.
              </ThemedText>
            </ThemedView>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function ActivityCard({ activity, myId }: { activity: ActivityWithPeople; myId?: string }) {
  const startsAt = new Date(activity.starts_at);
  const category = Categories[activity.category];
  const left = spotsLeft(activity);
  const badge =
    activity.host_id === myId
      ? 'Your post'
      : activity.members.some((m) => m.user_id === myId)
        ? "✓ You're in"
        : null;

  return (
    <Pressable
      onPress={() => router.push(`/activity/${activity.id}`)}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardTop}>
          <ThemedText type="small" themeColor="textSecondary">
            {category.emoji} {category.label}
          </ThemedText>
          {badge && (
            <ThemedText type="smallBold" themeColor="textSecondary">
              {badge}
            </ThemedText>
          )}
        </View>
        <ThemedText type="default" style={styles.title}>
          {activity.title}
        </ThemedText>
        <ThemedText type="small">
          🕒 {formatDay(startsAt)} · {formatTime(startsAt)}
        </ThemedText>
        <ThemedText type="small">📍 {activity.location}</ThemedText>
        <View style={styles.cardBottom}>
          <View style={styles.host}>
            <Avatar profile={activity.host} size={24} />
            <ThemedText type="small" themeColor="textSecondary">
              {displayName(activity.host)}
            </ThemedText>
          </View>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {left === 0 ? 'Full' : `${left} ${left === 1 ? 'spot' : 'spots'} left`}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
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
    paddingHorizontal: Spacing.four,
    paddingTop: TopTabInset + Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postButton: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  postLabel: {
    color: '#ffffff',
  },
  list: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.one,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  host: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontWeight: 700,
  },
  error: {
    color: '#e5484d',
  },
  pressed: {
    opacity: 0.7,
  },
});
