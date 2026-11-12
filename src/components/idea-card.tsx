import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { FloatingEmoji } from '@/components/art';
import { Avatar } from '@/components/avatar';
import { Pill } from '@/components/pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing, withAlpha } from '@/constants/theme';
import { Audiences, Categories, formatDay, formatTime, hasStarted } from '@/lib/activities';
import { downLabel, ideaSummary, isDown, peopleDown, type IdeaWithPeople } from '@/lib/ideas';
import { displayName } from '@/lib/profiles';

type IdeaCardProps = {
  idea: IdeaWithPeople;
  myId?: string;
  // Tapping "I'm down too" (or "You're down ✓" to undo). Leave out to hide the button.
  onToggleDown?: () => void;
  busy?: boolean;
  // Defaults to opening the idea. Set to null for a preview that does nothing.
  onPress?: (() => void) | null;
  // Fixed width for the sideways list on the feed.
  width?: number;
};

// An idea someone would be down for: no set time or place, just who's keen so far.
// Dashed edges so it reads as "not a plan yet", next to the solid activity cards.
export function IdeaCard({ idea, myId, onToggleDown, busy, onPress, width }: IdeaCardProps) {
  const category = Categories[idea.category];
  const people = peopleDown(idea);
  const mine = idea.user_id === myId;
  const down = isDown(idea, myId);
  // Someone hosted it: the card now leads to the plan instead of collecting interest.
  const plan = idea.activity_id ? idea.activity : null;
  const started = !!plan && hasStarted(plan);
  const accent = plan ? '#22C55E' : category.color;
  const open = () => (plan ? router.push(`/activity/${plan.id}`) : router.push(`/idea/${idea.id}`));

  return (
    <Pressable
      disabled={onPress === null}
      onPress={onPress ?? open}
      style={({ pressed }) => [width !== undefined && { width }, pressed && styles.pressed]}>
      <ThemedView
        type="backgroundElement"
        style={[
          styles.card,
          {
            borderColor: withAlpha(accent, 0.6),
            backgroundImage: `linear-gradient(135deg, ${withAlpha(accent, 0.18)} 0%, transparent 60%)`,
          },
        ]}>
        <FloatingEmoji
          emoji={plan ? '🎉' : '💡'}
          size={84}
          rotate={12}
          opacity={0.1}
          at={{ right: -10, top: -6 }}
        />
        <View style={styles.pills}>
          {plan ? (
            <Pill color="#22C55E" label="🎉 It's on!" bold />
          ) : (
            <Pill color={Brand.purple} label="💡 Idea" bold />
          )}
          <Pill color={category.color} label={`${category.emoji} ${category.label}`} />
          {idea.audience !== 'everyone' && (
            <Pill
              color={idea.audience === 'girls' ? Brand.pink : Brand.blue}
              label={Audiences[idea.audience].label}
            />
          )}
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          {mine ? "You'd be down for" : `${displayName(idea.poster)} would be down for`}
        </ThemedText>
        <ThemedText type="default" style={styles.title} numberOfLines={2}>
          {idea.title || 'Your idea'}
        </ThemedText>
        {plan ? (
          <ThemedText type="small" numberOfLines={2}>
            {`🕒 ${formatDay(new Date(plan.starts_at))} · ${formatTime(new Date(plan.starts_at))}`}
            {started ? '  ·  Started' : ''}
          </ThemedText>
        ) : (
          <ThemedText type="small" numberOfLines={2}>
            {ideaSummary(idea)}
          </ThemedText>
        )}
        {!plan && idea.note && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            “{idea.note}”
          </ThemedText>
        )}

        <View style={styles.bottom}>
          <View style={styles.people}>
            <View style={styles.faces}>
              {people.slice(0, 4).map((person, i) => (
                <View key={person.id} style={[styles.face, i > 0 && styles.overlap]}>
                  <Avatar profile={person} size={24} />
                </View>
              ))}
            </View>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {downLabel(idea, myId)}
            </ThemedText>
          </View>

          {plan
            ? onPress !== null && (
                <Pressable
                  onPress={open}
                  hitSlop={6}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <View style={[styles.downButton, styles.downOff]}>
                    <ThemedText type="smallBold" style={styles.downLabel}>
                      See the plan ›
                    </ThemedText>
                  </View>
                </Pressable>
              )
            : onToggleDown &&
              !mine && (
                <Pressable
                  disabled={busy}
                  onPress={onToggleDown}
                  hitSlop={6}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <View style={[styles.downButton, down ? styles.downOn : styles.downOff]}>
                    {busy ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <ThemedText type="smallBold" style={styles.downLabel}>
                        {down ? "You're down ✓" : "I'm down too"}
                      </ThemedText>
                    )}
                  </View>
                </Pressable>
              )}
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: Spacing.one,
    overflow: 'hidden',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  title: {
    fontWeight: 700,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  people: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  faces: {
    flexDirection: 'row',
  },
  face: {
    borderRadius: 14,
  },
  overlap: {
    marginLeft: -8,
  },
  downButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    minWidth: 112,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downOff: {
    backgroundColor: Brand.blue,
    backgroundImage: Brand.gradient,
  },
  downOn: {
    backgroundColor: '#22C55E',
  },
  downLabel: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
});
