import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { FloatingEmoji } from '@/components/art';
import { Avatar } from '@/components/avatar';
import { Pill } from '@/components/pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing, withAlpha } from '@/constants/theme';
import {
  Audiences,
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
  // Shown instead of the rank badge when this is the host's first meetup.
  hostFirstTimer?: boolean;
  // Defaults to opening the activity.
  onPress?: () => void;
};

export function ActivityCard({
  activity,
  myId,
  unread = 0,
  hostXp,
  hostFirstTimer,
  onPress,
}: ActivityCardProps) {
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

  const started = hasStarted(activity);
  const status = started
    ? { label: 'Started', color: '#94A3B8' }
    : left === 0
      ? { label: 'Full', color: '#EF4444' }
      : left === 1
        ? { label: '1 spot left', color: '#F59E0B' }
        : { label: `${left} spots left`, color: '#22C55E' };

  return (
    <Pressable
      onPress={onPress ?? (() => router.push(`/activity/${activity.id}`))}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type="backgroundElement"
        style={[
          styles.card,
          {
            shadowColor: category.color,
            // A wash of the category's colour from the top-left corner.
            backgroundImage: `linear-gradient(135deg, ${withAlpha(category.color, 0.22)} 0%, transparent 55%)`,
          },
        ]}>
        {/* A stripe in the category's colour down the left edge. */}
        <View style={[styles.stripe, { backgroundColor: category.color }]} />
        {/* The category's emoji as faded artwork behind the text. */}
        <FloatingEmoji
          emoji={category.emoji}
          size={110}
          rotate={-14}
          opacity={0.14}
          at={{ right: -18, top: 34 }}
        />

        <View style={styles.top}>
          <View style={styles.pills}>
            <Pill color={category.color} label={`${category.emoji} ${category.label}`} />
            {activity.audience !== 'everyone' && (
              <Pill
                color={activity.audience === 'girls' ? Brand.pink : Brand.blue}
                label={`${Audiences[activity.audience].emoji} ${Audiences[activity.audience].label}`}
              />
            )}
          </View>
          {badge && (
            <ThemedText type="smallBold" style={{ color: Brand.purple }}>
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
              {hostFirstTimer
                ? ' · 🌱 First-timer'
                : hostXp !== undefined && ` · ${rankFor(hostXp).emoji} ${rankFor(hostXp).name}`}
            </ThemedText>
          </View>
          <Pill color={status.color} label={status.label} bold />
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    paddingLeft: Spacing.four + Spacing.one,
    borderRadius: Spacing.four,
    gap: Spacing.one,
    overflow: 'hidden',
    // Soft glow in the category colour.
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    flexShrink: 1,
  },
  title: {
    fontWeight: 700,
  },
  unread: {
    color: Brand.blue,
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
