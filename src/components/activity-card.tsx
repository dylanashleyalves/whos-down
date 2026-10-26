import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  Categories,
  formatDay,
  formatTime,
  hasStarted,
  needsCheckIn,
  spotsLeft,
  type ActivityWithPeople,
} from '@/lib/activities';
import { displayName } from '@/lib/profiles';
import { rankFor } from '@/lib/ranks';

type ActivityCardProps = {
  activity: ActivityWithPeople;
  myId?: string;
  unread?: number;
  // The host's recent XP, to show their rank badge.
  hostXp?: number;
  // Defaults to opening the activity.
  onPress?: () => void;
};

export function ActivityCard({ activity, myId, unread = 0, hostXp, onPress }: ActivityCardProps) {
  const startsAt = new Date(activity.starts_at);
  const category = Categories[activity.category];
  const left = spotsLeft(activity);
  const badge =
    activity.host_id === myId
      ? needsCheckIn(activity)
        ? '📋 Check in'
        : 'Your post'
      : activity.members.some((m) => m.user_id === myId)
        ? "✓ You're in"
        : null;

  return (
    <Pressable
      onPress={onPress ?? (() => router.push(`/activity/${activity.id}`))}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.top}>
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
          <ThemedText type="smallBold" style={styles.unread}>
            💬 {unread} new {unread === 1 ? 'message' : 'messages'}
          </ThemedText>
        )}
        <View style={styles.bottom}>
          <View style={styles.host}>
            <Avatar profile={activity.host} size={24} />
            <ThemedText type="small" themeColor="textSecondary">
              {displayName(activity.host)}
              {hostXp !== undefined && ` · ${rankFor(hostXp).emoji} ${rankFor(hostXp).name}`}
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
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.one,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: 700,
  },
  unread: {
    color: '#3c87f7',
  },
  bottom: {
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
  pressed: {
    opacity: 0.7,
  },
});
