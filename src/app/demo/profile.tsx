import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { DemoTabBar } from '@/components/demo-tab-bar';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Categories } from '@/lib/activities';
import { DEMO_CREW, DEMO_ME } from '@/lib/demo-data';
import { displayName } from '@/lib/profiles';

// Dev-only copy of the Profile tab with sample data, for screenshots.
export default function DemoProfileScreen() {
  const me = DEMO_ME;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Avatar profile={me} size={88} />
            <ThemedText type="subtitle">{displayName(me)}</ThemedText>
            <ThemedText themeColor="textSecondary">
              📍 {me.city} · Singapore
            </ThemedText>
          </View>

          <ThemedText style={styles.center}>{me.bio}</ThemedText>

          <View style={styles.interests}>
            {me.interests.map((key) => (
              <ThemedView key={key} type="backgroundElement" style={styles.interest}>
                <ThemedText type="small">
                  {Categories[key].emoji} {Categories[key].label}
                </ThemedText>
              </ThemedView>
            ))}
          </View>

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
  interest: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  friend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
