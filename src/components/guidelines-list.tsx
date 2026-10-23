import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const RULES = [
  {
    title: '18+ only',
    body: "Who's Down is for adults. Don't sign up or invite anyone under 18.",
  },
  {
    title: 'Be real',
    body: 'Use your real first name and a photo of you. No fake profiles, no pretending to be someone else.',
  },
  {
    title: 'Respect everyone',
    body: 'No harassment, threats, hate, or unwanted advances. "No" means no, in chat and in person.',
  },
  {
    title: 'Meet in public',
    body: 'Pick public places like parks, gyms, cafés and venues, especially the first time you meet someone.',
  },
  {
    title: 'Show up or speak up',
    body: "If you can't make it, leave the activity or say so in the group chat so nobody's left waiting.",
  },
  {
    title: 'No selling or spam',
    body: "Activities are for hanging out, not for promoting businesses, selling things, or recruiting.",
  },
  {
    title: 'Look out for each other',
    body: 'Report anything that breaks these rules. Block anyone you never want to see again. Reports are private.',
  },
];

// The community guidelines text, shown on its own page and inside profile setup.
export function GuidelinesList() {
  return (
    <View style={styles.list}>
      <ThemedText themeColor="textSecondary">
        Who&apos;s Down is about making real friends by doing things together. These rules keep it
        safe and worth showing up for. Breaking them can get your account removed.
      </ThemedText>
      {RULES.map((rule, i) => (
        <View key={rule.title} style={styles.rule}>
          <ThemedText type="smallBold">
            {i + 1}. {rule.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {rule.body}
          </ThemedText>
        </View>
      ))}
      <ThemedText type="small" themeColor="textSecondary">
        If someone is in danger, contact your local emergency services first.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.four,
  },
  rule: {
    gap: Spacing.one,
  },
});
