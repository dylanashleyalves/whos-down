import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityCard } from '@/components/activity-card';
import { Chip } from '@/components/chip';
import { DemoTabBar } from '@/components/demo-tab-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Categories, type Category } from '@/lib/activities';
import { DEMO_ACTIVITIES, DEMO_ME } from '@/lib/demo-data';

// Dev-only copy of the Feed with sample data, for screenshots.
export default function DemoFeedScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Who&apos;s down?</ThemedText>
            <View style={styles.postButton}>
              <ThemedText type="smallBold" style={styles.white}>
                + Post
              </ThemedText>
            </View>
          </View>

          <View style={styles.row}>
            <Chip label="Discover" selected onPress={() => {}} />
            <Chip label="My plans" selected={false} onPress={() => {}} />
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            Upcoming activities with spots left in Singapore
          </ThemedText>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            <Chip label="All" selected onPress={() => {}} />
            {(Object.keys(Categories) as Category[]).map((key) => (
              <Chip
                key={key}
                label={`${Categories[key].emoji} ${Categories[key].label}`}
                selected={false}
                onPress={() => {}}
              />
            ))}
          </ScrollView>

          <View style={styles.banner}>
            <ThemedText type="smallBold" style={styles.white}>
              💬 2 new messages in My plans
            </ThemedText>
          </View>

          {DEMO_ACTIVITIES.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              myId={DEMO_ME.id}
              onPress={() => router.push('/demo/activity')}
            />
          ))}
        </ScrollView>
        <DemoTabBar active="feed" />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postButton: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  white: {
    color: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  banner: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
