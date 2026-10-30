import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { CategoryHero } from '@/components/category-hero';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Categories, formatDay, formatTime, spotsLeft } from '@/lib/activities';
import { DEMO_ACTIVITIES } from '@/lib/demo-data';
import { displayName } from '@/lib/profiles';

// Dev-only copy of the activity screen, seen by someone who hasn't joined yet.
export default function DemoActivityScreen() {
  const activity = DEMO_ACTIVITIES.find((a) => a.id === 'hike')!;
  const startsAt = new Date(activity.starts_at);
  const category = Categories[activity.category];
  const left = spotsLeft(activity);
  const people = [
    { profile: activity.host, isHost: true },
    ...activity.members.map((m) => ({ profile: m.profile, isHost: false })),
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView type="backgroundElement" style={[styles.card, { shadowColor: category.color }]}>
          <View style={styles.hero}>
            <CategoryHero category={activity.category} />
          </View>
          <ThemedText type="subtitle" style={styles.title}>
            {activity.title}
          </ThemedText>
          <ThemedText>
            🕒 {formatDay(startsAt)} · {formatTime(startsAt)}
          </ThemedText>
          <ThemedText>📍 {activity.location}</ThemedText>
          <ThemedText type="linkPrimary">🗺️ Get directions</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Meet at the visitor centre. Bring water and comfy shoes, we&apos;ll grab breakfast
            after.
          </ThemedText>
          <View style={styles.hostRow}>
            <Avatar profile={activity.host} size={28} />
            <ThemedText type="small">Hosted by {displayName(activity.host)}</ThemedText>
          </View>
        </ThemedView>

        <ThemedText type="smallBold" themeColor="textSecondary">
          {left} of {activity.spots} spots left
        </ThemedText>

        <PrimaryButton label="I'm down" onPress={() => router.push('/demo/chat')} />

        <ThemedText type="smallBold">Who&apos;s going ({people.length})</ThemedText>
        <View style={styles.people}>
          {people.map(({ profile, isHost }) => (
            <View key={profile?.id} style={styles.person}>
              <Avatar profile={profile} />
              <View>
                <ThemedText type="smallBold">{displayName(profile)}</ThemedText>
                {isHost && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Host
                  </ThemedText>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.two,
    overflow: 'hidden',
    // A soft glow in the category's colour.
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  // Edge to edge across the top of the card.
  hero: {
    marginTop: -Spacing.four,
    marginHorizontal: -Spacing.four,
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  people: {
    gap: Spacing.three,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
