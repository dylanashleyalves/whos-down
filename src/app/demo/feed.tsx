import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityCard } from '@/components/activity-card';
import { BackdropGlow } from '@/components/art';
import { Chip } from '@/components/chip';
import { DemoTabBar } from '@/components/demo-tab-bar';
import { ThemedText } from '@/components/themed-text';
import { WelcomeBanner } from '@/components/welcome-banner';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { Categories, type Category } from '@/lib/activities';
import { DEMO_ACTIVITIES, DEMO_ME } from '@/lib/demo-data';

// Dev-only copy of the Feed with sample data, for screenshots.
export default function DemoFeedScreen() {
  return (
    <ThemedView style={styles.container}>
      <BackdropGlow />
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}>
            <Chip label="All" selected onPress={() => {}} />
            {(Object.keys(Categories) as Category[]).map((key) => (
              <Chip
                key={key}
                label={`${Categories[key].emoji} ${Categories[key].label}`}
                color={Categories[key].color}
                selected={false}
                onPress={() => {}}
              />
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}>
            <Chip label="Any time" selected={false} onPress={() => {}} />
            <Chip label="⚡ Next 2 hours" color={Brand.pink} selected onPress={() => {}} />
            <Chip label="Today" color={Brand.pink} selected={false} onPress={() => {}} />
            <Chip label="Tomorrow" color={Brand.pink} selected={false} onPress={() => {}} />
          </ScrollView>

          <WelcomeBanner name={DEMO_ME.display_name} place="Singapore" />

          <View style={styles.banner}>
            <ThemedText type="smallBold" style={styles.white}>
              💬 2 new messages in My plans
            </ThemedText>
          </View>

          {/* No slide-in animation here, so screenshots never catch cards mid-way. */}
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
    overflow: 'hidden',
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
    backgroundColor: Brand.blue,
    backgroundImage: Brand.gradient,
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
    backgroundColor: Brand.blue,
    backgroundImage: Brand.gradient,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
