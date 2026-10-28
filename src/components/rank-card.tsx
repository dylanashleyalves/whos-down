import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { nextRank, rankFor, type UserStats } from '@/lib/ranks';

// Someone's rank, progress to the next one, and their meetup stats.
export function RankCard({ stats }: { stats: UserStats }) {
  const theme = useTheme();

  const rank = rankFor(stats.xp_recent);
  const next = nextRank(stats.xp_recent);
  const progress = next ? (stats.xp_recent - rank.minXp) / (next.minXp - rank.minXp) : 1;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {/* The rank's own colours: green for Rookie, then bronze, silver, gold and Legend. */}
      <View style={[styles.top, { backgroundImage: rank.gradient }]}>
        <ThemedText type="subtitle" style={styles.emoji}>
          {rank.emoji}
        </ThemedText>
        <View style={styles.grow}>
          <ThemedText type="smallBold" style={styles.rankName}>
            {rank.name}
          </ThemedText>
          <ThemedText type="small" style={styles.rankXp}>
            {next
              ? `${stats.xp_recent} XP · ${next.minXp - stats.xp_recent} to ${next.emoji} ${next.name}`
              : `${stats.xp_recent} XP · top rank`}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.round(progress * 100)}%`,
              backgroundImage: rank.gradient,
            },
          ]}
        />
      </View>

      <View style={styles.stats}>
        <Stat value={stats.meetups} label="meetups" />
        <Stat value={stats.people_met} label="people met" />
        <Stat value={stats.streak_weeks} label="week streak 🔥" />
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Earn XP by showing up to meetups, meeting new people and seeing your crew again. Ranks use
        the last 90 days, so keep going out to hold yours.
      </ThemedText>
    </ThemedView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="subtitle" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.three,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: Brand.blue,
  },
  rankName: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 24,
  },
  rankXp: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  emoji: {
    fontSize: 36,
    lineHeight: 44,
  },
  grow: {
    flex: 1,
  },
  bar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Brand.blue,
    backgroundImage: Brand.gradient,
    borderRadius: 4,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    lineHeight: 30,
  },
});
