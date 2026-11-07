import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing, withAlpha } from '@/constants/theme';

const CHOICES = [
  {
    href: '/new-activity',
    emoji: '📅',
    color: Brand.blue,
    title: 'Post an activity',
    text: 'You know what, where and when.',
    expect: [
      'People can join straight away',
      'You get a group chat with everyone going',
      'One activity a day',
    ],
  },
  {
    href: '/new-idea',
    emoji: '💡',
    color: Brand.purple,
    title: "I'd be down for…",
    text: 'Got an idea but no plan yet? Not sure how many people?',
    expect: [
      'People tap "I\'m down too" to show they\'re keen',
      'Once 3 of you are in, anyone can host it',
      'No time, place or group size needed',
    ],
  },
] as const;

// "+ Post" opens this first, so people can pick a fixed plan or a loose idea.
export default function NewPostScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary">
          What kind of post?
        </ThemedText>
        {CHOICES.map((choice) => (
          <Pressable
            key={choice.href}
            // Replace, so going back from the form lands on the feed, not here.
            onPress={() => router.replace(choice.href)}
            accessibilityRole="button"
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView
              type="backgroundElement"
              style={[
                styles.card,
                {
                  borderColor: withAlpha(choice.color, 0.5),
                  backgroundImage: `linear-gradient(135deg, ${withAlpha(choice.color, 0.2)} 0%, transparent 60%)`,
                },
              ]}>
              <View style={styles.top}>
                <ThemedText style={styles.emoji}>{choice.emoji}</ThemedText>
                <View style={styles.grow}>
                  <ThemedText type="default" style={styles.title}>
                    {choice.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {choice.text}
                  </ThemedText>
                </View>
                <ThemedText type="subtitle" themeColor="textSecondary">
                  ›
                </ThemedText>
              </View>
              <View style={styles.expect}>
                {choice.expect.map((line) => (
                  <ThemedText key={line} type="small">
                    ✓ {line}
                  </ThemedText>
                ))}
              </View>
            </ThemedView>
          </Pressable>
        ))}
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
    borderWidth: 1.5,
    gap: Spacing.three,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  emoji: {
    fontSize: 32,
    lineHeight: 40,
  },
  grow: {
    flex: 1,
  },
  title: {
    fontWeight: 700,
  },
  expect: {
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
