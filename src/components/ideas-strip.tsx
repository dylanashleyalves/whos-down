import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { IdeaCard } from '@/components/idea-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { setDown, type IdeaWithPeople } from '@/lib/ideas';
import { showToast } from '@/lib/toast';

const CARD_WIDTH = 290;

type IdeasStripProps = {
  ideas: IdeaWithPeople[];
  myId?: string;
  title: string;
  // Called after someone taps "I'm down too", so the feed can reload the counts.
  onChanged: () => void;
  // Lets the Add card change "share your idea" wording when there are none yet.
  showAdd?: boolean;
};

// The sideways row of ideas at the top of the feed, with a card to add your own.
export function IdeasStrip({ ideas, myId, title, onChanged, showAdd = true }: IdeasStripProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(idea: IdeaWithPeople) {
    const down = idea.interest.some((row) => row.user_id === myId);
    setBusyId(idea.id);
    try {
      await setDown(idea.id, !down);
      if (!down) showToast("🙌 You're down! We'll let you know when it's on");
      onChanged();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Something went wrong.');
    }
    setBusyId(null);
  }

  if (ideas.length === 0 && !showAdd) return null;

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {ideas.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            myId={myId}
            width={CARD_WIDTH}
            busy={busyId === idea.id}
            onToggleDown={() => toggle(idea)}
          />
        ))}
        {showAdd && (
          <Pressable
            onPress={() => router.push('/new-idea')}
            style={({ pressed }) => [
              { width: ideas.length === 0 ? CARD_WIDTH + 40 : 170 },
              pressed && styles.pressed,
            ]}>
            <ThemedView type="backgroundElement" style={styles.add}>
              <ThemedText style={styles.addEmoji}>💡</ThemedText>
              <ThemedText type="smallBold" style={styles.center}>
                {ideas.length === 0 ? 'Got an idea but no plan?' : 'Add your idea'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                {ideas.length === 0
                  ? "Share what you'd be down for and see who's keen. No time or place needed."
                  : "Share what you'd be down for"}
              </ThemedText>
            </ThemedView>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  row: {
    gap: Spacing.three,
    paddingRight: Spacing.two,
  },
  add: {
    flex: 1,
    minHeight: 150,
    padding: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Brand.purple,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  addEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  center: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
