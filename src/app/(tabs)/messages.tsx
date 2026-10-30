import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { formatDay, formatTime } from '@/lib/activities';
import { fetchDmThreads, type DmThread } from '@/lib/dms';
import { displayName } from '@/lib/profiles';

// Your one-on-one conversations with crew members.
export default function MessagesScreen() {
  const [threads, setThreads] = useState<DmThread[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setThreads(await fetchDmThreads());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load messages.');
    }
  }, []);

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
        <ThemedText type="subtitle">Messages</ThemedText>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        {threads === null ? (
          <ActivityIndicator size="large" style={styles.spinner} />
        ) : (
          <FlatList
            data={threads}
            keyExtractor={(item) => item.other_id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
            renderItem={({ item }) => <ThreadRow thread={item} />}
            ListEmptyComponent={
              <EmptyState
                emoji="💬"
                title="No messages yet"
                text={
                  'You can message people in your crew. After a meetup, tap "Hang again?" on the people you got on with. When they pick you too, you can chat here. Until then, use the group chat in each activity.'
                }
                action={{ label: 'Find an activity', onPress: () => router.navigate('/') }}
              />
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function ThreadRow({ thread }: { thread: DmThread }) {
  const when = thread.last_at ? new Date(thread.last_at) : null;
  const preview = thread.last_body
    ? `${thread.last_from_me ? 'You: ' : ''}${thread.last_body}`
    : 'In your crew · say hi 👋';

  return (
    <Pressable
      onPress={() => router.push(`/dm/${thread.other_id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Pressable
        onPress={() => router.push(`/user/${thread.other_id}`)}
        accessibilityRole="button"
        accessibilityLabel={`View ${displayName(thread)}'s profile`}>
        <Avatar profile={thread} size={48} />
      </Pressable>
      <View style={styles.text}>
        <View style={styles.rowTop}>
          <ThemedText type="smallBold" style={styles.grow} numberOfLines={1}>
            {displayName(thread)}
          </ThemedText>
          {when && (
            <ThemedText type="small" themeColor="textSecondary">
              {formatDay(when) === 'Today' ? formatTime(when) : formatDay(when)}
            </ThemedText>
          )}
        </View>
        <View style={styles.rowTop}>
          <ThemedText
            type={thread.unread > 0 ? 'smallBold' : 'small'}
            themeColor={thread.unread > 0 ? 'text' : 'textSecondary'}
            style={styles.grow}
            numberOfLines={1}>
            {preview}
          </ThemedText>
          {thread.unread > 0 && (
            <View style={styles.badge}>
              <ThemedText type="smallBold" style={styles.badgeText}>
                {thread.unread}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
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
  list: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: Spacing.one,
    backgroundColor: Brand.blue,
    backgroundImage: Brand.gradient,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 16,
  },
  error: {
    color: '#e5484d',
  },
  spinner: {
    marginTop: Spacing.six,
  },
  pressed: {
    opacity: 0.7,
  },
});
