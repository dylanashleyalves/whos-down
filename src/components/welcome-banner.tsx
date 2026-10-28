import { StyleSheet, View } from 'react-native';

import { FloatingEmoji, Orb } from '@/components/art';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';

type WelcomeBannerProps = {
  name: string | null | undefined;
  // Where activities are shown from, e.g. "🇸🇬 Singapore".
  place: string | null;
};

function greeting(hour: number) {
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Hey';
  return 'Evening';
}

// The colourful card at the top of the Feed.
export function WelcomeBanner({ name, place }: WelcomeBannerProps) {
  const firstName = name?.trim().split(/\s+/)[0];
  return (
    <View style={styles.banner}>
      {/* Artwork: soft lights and a scatter of activity emojis on the right. */}
      <Orb size={220} color="#ffffff40" at={{ top: -90, right: -60 }} />
      <Orb size={160} color="#F9731666" at={{ bottom: -80, left: -40 }} />
      <FloatingEmoji emoji="🏀" size={44} rotate={-18} at={{ top: 10, right: 18 }} />
      <FloatingEmoji emoji="🎮" size={30} rotate={14} at={{ top: 68, right: 72 }} />
      <FloatingEmoji emoji="🍜" size={34} rotate={-8} at={{ bottom: 8, right: 14 }} />
      <FloatingEmoji emoji="✨" size={22} rotate={0} opacity={0.9} at={{ top: 18, right: 96 }} />
      <ThemedText type="smallBold" style={styles.kicker}>
        {place ? `📍 ${place}` : "WHO'S DOWN"}
      </ThemedText>
      <ThemedText type="subtitle" style={styles.title}>
        {greeting(new Date().getHours())}
        {firstName ? `, ${firstName}` : ''} 👋
      </ThemedText>
      <ThemedText style={styles.text}>What are you down for today?</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.one,
    backgroundColor: Brand.purple,
    backgroundImage: Brand.sunset,
    overflow: 'hidden',
    minHeight: 130,
    justifyContent: 'center',
  },
  kicker: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  title: {
    color: '#ffffff',
    // Leave room for the emojis on the right.
    marginRight: 90,
    fontSize: 28,
    lineHeight: 34,
  },
  text: {
    color: 'rgba(255, 255, 255, 0.92)',
  },
});
