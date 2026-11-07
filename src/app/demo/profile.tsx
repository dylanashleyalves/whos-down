import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { AvatarRing } from '@/components/avatar-ring';
import { StatusPicker } from '@/components/availability';
import { KudosPills } from '@/components/kudos-pills';
import { MySocials } from '@/components/my-socials';
import { ProfileAbout } from '@/components/profile-about';
import { ProfileCover } from '@/components/profile-cover';
import { DemoTabBar } from '@/components/demo-tab-bar';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
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

          <View style={styles.actions}>
            <View style={styles.grow}>
              <PrimaryButton label="Edit profile" variant="secondary" onPress={() => {}} />
            </View>
            <View style={styles.grow}>
              <PrimaryButton label="📤 Share" variant="secondary" onPress={() => {}} />
            </View>
          </View>

          <StatusPicker />

          <ProfileAbout
            profile={{
              bio: me.bio,
              interests: me.interests,
              free_times: ['weekday_evenings', 'weekend_daytime'],
            }}
          />

          <KudosPills
            kudos={[
              { tag: 'friendly', total: 7 },
              { tag: 'great_vibes', total: 5 },
              { tag: 'on_time', total: 4 },
              { tag: 'skilled', total: 2 },
            ]}
          />

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

          <MySocials
            socials={{ instagram: 'dylan_a', telegram: null, tiktok: null, spotify: 'abc' }}
          />
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
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  friend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
