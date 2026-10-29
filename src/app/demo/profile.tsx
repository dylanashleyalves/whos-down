import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { AvatarRing } from '@/components/avatar-ring';
import { Pill } from '@/components/pill';
import { Availability, StatusPicker } from '@/components/availability';
import { KudosPills } from '@/components/kudos-pills';
import { ProfileCover } from '@/components/profile-cover';
import { DemoTabBar } from '@/components/demo-tab-bar';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { Categories } from '@/lib/activities';
import { DEMO_CREW, DEMO_ME } from '@/lib/demo-data';
import { displayName } from '@/lib/profiles';

// Dev-only copy of the Profile tab with sample data, for screenshots.
export default function DemoProfileScreen() {
  // ?name=…&bio=… previews how a different bio themes the cover.
  const params = useLocalSearchParams<{ name?: string; bio?: string }>();
  const me = params.bio
    ? {
        ...DEMO_ME,
        display_name: params.name ?? DEMO_ME.display_name,
        bio: params.bio,
        interests: [],
      }
    : DEMO_ME;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ProfileCover bio={me.bio} interests={me.interests}>
              <AvatarRing profile={me} size={88} />
            </ProfileCover>
            <ThemedText type="subtitle">{displayName(me)}</ThemedText>
            <ThemedText themeColor="textSecondary">📍 {me.city} · Singapore</ThemedText>
          </View>

          <Availability
            profile={{
              status: 'free_tonight',
              status_until: '2099-01-01T00:00:00Z',
              free_times: ['weekday_evenings', 'weekend_daytime'],
            }}
          />

          <ThemedText style={styles.center}>{me.bio}</ThemedText>

          <View style={styles.interests}>
            {me.interests.map((key) => (
              <Pill
                key={key}
                size="medium"
                color={Categories[key]?.color ?? Brand.blue}
                label={`${Categories[key]?.emoji ?? ''} ${Categories[key]?.label ?? key}`}
              />
            ))}
          </View>

          <KudosPills
            kudos={[
              { tag: 'friendly', total: 7 },
              { tag: 'great_vibes', total: 5 },
              { tag: 'on_time', total: 4 },
              { tag: 'skilled', total: 2 },
            ]}
          />

          <StatusPicker />

          <PrimaryButton label="Edit profile" variant="secondary" onPress={() => {}} />

          <ThemedText type="smallBold">Your crew ({DEMO_CREW.length})</ThemedText>
          {DEMO_CREW.map((friend) => (
            <View key={friend.id} style={styles.friend}>
              <Avatar profile={friend} />
              <View>
                <ThemedText type="smallBold">{displayName(friend)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {friend.city}
                </ThemedText>
              </View>
            </View>
          ))}
        </ScrollView>
        <DemoTabBar active="profile" />
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
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  friend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
