import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Chip } from '@/components/chip';
import { QuietReminder } from '@/components/quiet-reminder';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import {
  ACTIVITY_WITH_PEOPLE,
  Categories,
  formatDay,
  formatTime,
  hasStarted,
  spotsLeft,
  type ActivityWithPeople,
  type Category,
} from '@/lib/activities';
import { fetchUnreadCounts } from '@/lib/chat';
import { formatCountry } from '@/lib/countries';
import { displayName } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

// My plans keeps past activities this long, so you can still chat and pick "Hang again?".
const MY_PLANS_HISTORY_MS = 30 * 24 * 60 * 60 * 1000;

type FeedView = 'discover' | 'mine';

function isMine(activity: ActivityWithPeople, myId: string | undefined) {
  return activity.host_id === myId || activity.members.some((m) => m.user_id === myId);
}

// Discover: upcoming activities with spots left. You'll find your own in My plans.
async function fetchDiscover(myId: string | undefined) {
  const { data, error } = await supabase
    .from('activities')
    .select(ACTIVITY_WITH_PEOPLE)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data as unknown as ActivityWithPeople[]).filter(
    (a) => isMine(a, myId) || spotsLeft(a) > 0
  );
}

// My plans: everything you're hosting or joined, upcoming first, then recent past ones.
async function fetchMyPlans(myId: string) {
  const joined = await supabase.from('activity_members').select('activity_id').eq('user_id', myId);
  if (joined.error) throw joined.error;
  const ids = joined.data.map((row) => row.activity_id as string);

  const { data, error } = await supabase
    .from('activities')
    .select(ACTIVITY_WITH_PEOPLE)
    .or(ids.length > 0 ? `host_id.eq.${myId},id.in.(${ids.join(',')})` : `host_id.eq.${myId}`)
    .gte('starts_at', new Date(Date.now() - MY_PLANS_HISTORY_MS).toISOString())
    .order('starts_at', { ascending: true })
    .limit(100);
  if (error) throw error;

  const all = data as unknown as ActivityWithPeople[];
  const upcoming = all.filter((a) => !hasStarted(a));
  const past = all.filter((a) => hasStarted(a)).reverse();
  return [...upcoming, ...past];
}

export default function FeedScreen() {
  const { session, profile } = useAuth();
  const myId = session?.user.id;
  const [view, setView] = useState<FeedView>('discover');
  const [activities, setActivities] = useState<ActivityWithPeople[]>([]);
  // Which view the list currently holds, so switching shows a spinner, not stale cards.
  const [loadedView, setLoadedView] = useState<FeedView | null>(null);
  const [filter, setFilter] = useState<Category | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState<Map<string, number>>(new Map());
  const totalUnread = [...unread.values()].reduce((sum, n) => sum + n, 0);

  const shown = filter ? activities.filter((a) => a.category === filter) : activities;

  const load = useCallback(async () => {
    try {
      const [result, counts] = await Promise.all([
        view === 'mine' && myId ? fetchMyPlans(myId) : fetchDiscover(myId),
        fetchUnreadCounts(),
      ]);
      setActivities(result);
      setUnread(counts);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load activities.');
    }
    setLoadedView(view);
  }, [view, myId]);

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

        <View style={styles.tabs}>
          <Chip label="Discover" selected={view === 'discover'} onPress={() => setView('discover')} />
          <Chip label="My plans" selected={view === 'mine'} onPress={() => setView('mine')} />
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          {view === 'discover'
            ? `Upcoming activities with spots left in ${formatCountry(profile?.country) ?? 'your country'}`
            : "Activities you're hosting or going to, including the last 30 days"}
        </ThemedText>

        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}>
            <Chip label="All" selected={filter === null} onPress={() => setFilter(null)} />
            {(Object.keys(Categories) as Category[]).map((key) => (
              <Chip
                key={key}
                label={`${Categories[key].emoji} ${Categories[key].label}`}
                selected={filter === key}
                onPress={() => setFilter(filter === key ? null : key)}
              />
            ))}
          </ScrollView>
        </View>

        {view === 'discover' && <QuietReminder />}

        {totalUnread > 0 && view === 'discover' && (
          <Pressable onPress={() => setView('mine')}>
            <View style={styles.unreadBanner}>
              <ThemedText type="smallBold" style={styles.unreadLabel}>
                💬 {totalUnread} new {totalUnread === 1 ? 'message' : 'messages'} in My plans
              </ThemedText>
            </View>
          </Pressable>
        )}

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        {loadedView !== view ? (
          <ActivityIndicator size="large" style={styles.spinner} />
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
            renderItem={({ item }) => (
              <ActivityCard activity={item} myId={myId} unread={unread.get(item.id) ?? 0} />
            )}
            ListEmptyComponent={
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">
                  {view === 'mine'
                    ? 'No plans yet'
                    : filter
                      ? `No ${Categories[filter].label.toLowerCase()} activities yet`
                      : 'No activities yet'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {view === 'mine'
                    ? 'Activities you post or join show up here, so you can find the group chat.'
                    : 'Be the first. Tap "+ Post" to start a game, a gym session or a hangout.'}
                </ThemedText>
              </ThemedView>
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

type ActivityCardProps = { activity: ActivityWithPeople; myId?: string; unread: number };

function ActivityCard({ activity, myId, unread }: ActivityCardProps) {
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
        {unread > 0 && (
          <ThemedText type="smallBold" style={styles.unreadText}>
            💬 {unread} new {unread === 1 ? 'message' : 'messages'}
          </ThemedText>
        )}
        <View style={styles.cardBottom}>
          <View style={styles.host}>
            <Avatar profile={activity.host} size={24} />
            <ThemedText type="small" themeColor="textSecondary">
              {displayName(activity.host)}
            </ThemedText>
          </View>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {hasStarted(activity)
              ? 'Started'
              : left === 0
                ? 'Full'
                : `${left} ${left === 1 ? 'spot' : 'spots'} left`}
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
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  unreadBanner: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  unreadLabel: {
    color: '#ffffff',
  },
  unreadText: {
    color: '#3c87f7',
  },
  filters: {
    gap: Spacing.two,
  },
  spinner: {
    marginTop: Spacing.six,
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
