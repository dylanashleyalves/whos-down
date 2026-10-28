import { IntroCards } from '@/components/intro-cards';
import { ThemedView } from '@/components/themed-view';

// Dev-only: the first-run intro, for screenshots.
export default function DemoIntroScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <IntroCards />
    </ThemedView>
  );
}
