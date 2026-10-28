import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingEmoji, Orb } from '@/components/art';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, colorGradient, MaxContentWidth, Spacing } from '@/constants/theme';

const SEEN_KEY = 'whosdown.introSeen.v1';

const CARDS = [
  {
    emoji: '👋',
    extras: ['🏀', '☕', '🎮'],
    background: Brand.sunset,
    title: "Welcome to Who's Down",
    text: 'Meet people by doing things together. No awkward small talk, just plans.',
  },
  {
    emoji: '📣',
    extras: ['🗓️', '📍'],
    background: colorGradient('#F97316'),
    title: "Post what you're down for",
    text: 'Basketball tonight? Coffee on Saturday? Tap "+ Post", pick a time and how many people you need. You can post one activity a day.',
  },
  {
    emoji: '🙋',
    extras: ['💬', '✨'],
    background: Brand.gradient,
    title: 'Join and chat',
    text: 'See something you like? Tap "I\'m down". You get a group chat with everyone going to sort out the details.',
  },
  {
    emoji: '🤝',
    extras: ['🏆', '🔥'],
    background: colorGradient('#22C55E'),
    title: 'Meet up and build your crew',
    text: 'After the meetup the host checks everyone in and you earn XP. Tap "Hang again?" on people you clicked with. If they pick you too, they join your crew and you can message them any time.',
  },
];

// Lets the Profile tab reopen the intro ("How Who's Down works").
let reopen: (() => void) | null = null;
export function showIntro() {
  reopen?.();
}

// A short swipe-free walkthrough shown once after sign-up.
export function IntroCards() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(SEEN_KEY)
      .then((seen) => {
        if (active && !seen) setVisible(true);
      })
      .catch(() => {});
    reopen = () => {
      setIndex(0);
      setVisible(true);
    };
    return () => {
      active = false;
      reopen = null;
    };
  }, []);

  if (!visible) return null;

  const card = CARDS[index];
  const last = index === CARDS.length - 1;

  function finish() {
    setVisible(false);
    AsyncStorage.setItem(SEEN_KEY, '1').catch(() => {});
  }

  return (
    <ThemedView style={styles.overlay}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.top}>
          <ThemedText type="small" themeColor="textSecondary">
            {index + 1} of {CARDS.length}
          </ThemedText>
          {!last && (
            <Pressable onPress={finish} hitSlop={12}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Skip
              </ThemedText>
            </Pressable>
          )}
        </View>

        <Animated.View key={index} entering={FadeInRight.springify()} style={styles.body}>
          <View style={[styles.art, { backgroundImage: card.background }]}>
            <Orb size={260} color="#ffffff40" at={{ top: -110, left: -60 }} />
            <Orb size={220} color="#00000030" at={{ bottom: -110, right: -50 }} />
            {card.extras.map((emoji, i) => (
              <FloatingEmoji
                key={emoji}
                emoji={emoji}
                size={34 - i * 4}
                rotate={i % 2 === 0 ? -14 : 12}
                at={EXTRA_SPOTS[i]}
              />
            ))}
            <ThemedText style={styles.bigEmoji}>{card.emoji}</ThemedText>
          </View>

          <ThemedText type="subtitle" style={styles.title}>
            {card.title}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.text}>
            {card.text}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeIn} style={styles.bottom}>
          <View style={styles.dots}>
            {CARDS.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
            ))}
          </View>
          <PrimaryButton
            label={last ? "Let's go 🚀" : 'Next'}
            onPress={() => (last ? finish() : setIndex(index + 1))}
          />
          {index > 0 && (
            <PrimaryButton label="Back" variant="secondary" onPress={() => setIndex(index - 1)} />
          )}
        </Animated.View>
      </SafeAreaView>
    </ThemedView>
  );
}

const EXTRA_SPOTS = [
  { top: 24, left: 28 },
  { bottom: 30, right: 34 },
  { top: 40, right: 44 },
];

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 4000,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
  },
  art: {
    height: 260,
    borderRadius: Spacing.five,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.purple,
    marginBottom: Spacing.three,
  },
  bigEmoji: {
    fontSize: 110,
    lineHeight: 130,
  },
  title: {
    textAlign: 'center',
  },
  text: {
    textAlign: 'center',
    lineHeight: 24,
  },
  bottom: {
    gap: Spacing.two,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94A3B866',
  },
  dotOn: {
    width: 24,
    backgroundColor: Brand.purple,
  },
});
