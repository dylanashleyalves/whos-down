import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { nextRank, rankFor, RANKS, type UserStats } from '@/lib/ranks';

// Matches the XP rules in supabase/migrations/0008_ranks.sql.
const XP_RULES = [
  ['🎉 Host a meetup', '+20'],
  ['🙋 Go to a meetup', '+10'],
  ['👋 Each new person you meet there', '+5'],
  ['🤝 Each person you’ve met before', '+10'],
  ['🔁 You both tap "Hang again?"', '+15'],
  ['🚫 Not showing up', '−15'],
];

// Someone's rank, progress to the next one, and their meetup stats.
export function RankCard({ stats }: { stats: UserStats }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

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

      <Pressable onPress={() => setOpen(!open)} hitSlop={8}>
        <ThemedText type="linkPrimary">
          {open ? 'Hide how ranks work ▴' : 'How do ranks work? ▾'}
        </ThemedText>
      </Pressable>

      {open && (
        <View style={styles.explainer}>
          <ThemedText type="smallBold">Earn XP by meeting up</ThemedText>
          {XP_RULES.map(([what, xp]) => (
            <View key={what} style={styles.ruleRow}>
              <ThemedText type="small" style={styles.grow}>
                {what}
              </ThemedText>
              <ThemedText
                type="smallBold"
                style={{ color: xp.startsWith('−') ? '#EF4444' : '#22C55E' }}>
                {xp}
              </ThemedText>
            </View>
          ))}
          <ThemedText type="small" themeColor="textSecondary">
            Meetups count once the host checks everyone in, with at least 2 people there. Ranks use
            your last 90 days, so keep going out to hold yours.
          </ThemedText>

          <ThemedText type="smallBold" style={styles.ranksHeading}>
            Ranks
          </ThemedText>
          {RANKS.map((r) => (
            <View key={r.name} style={styles.ruleRow}>
              <View style={[styles.rankDot, { backgroundImage: r.gradient }]} />
              <ThemedText type="small" style={styles.grow}>
                {r.emoji} {r.name}
                {r.name === rank.name ? '  ← current' : ''}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {r.minXp} XP
              </ThemedText>
            </View>
          ))}
        </View>
      )}
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
  explainer: {
    gap: Spacing.two,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  ranksHeading: {
    marginTop: Spacing.two,
  },
  rankDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
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
