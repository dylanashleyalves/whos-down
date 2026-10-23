import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Chip } from '@/components/chip';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const REASONS = {
  harassment: 'Harassment or threats',
  inappropriate: 'Inappropriate content',
  unsafe: 'Unsafe behaviour at a meetup',
  fake: 'Fake profile',
  underage: 'Under 18',
  not_a_guy: 'Not a guy',
  spam: 'Spam, selling or scams',
  other: 'Something else',
} as const;

type Reason = keyof typeof REASONS;

// Reports a person, an activity, or both. Reports go to the reports table for review.
export default function ReportScreen() {
  const { userId, activityId } = useLocalSearchParams<{ userId?: string; activityId?: string }>();
  const theme = useTheme();

  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!reason) {
      setError('Pick a reason.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('reports').insert({
      reported_user_id: userId ?? null,
      activity_id: activityId ?? null,
      reason,
      details: details.trim() || null,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText type="subtitle">Thanks for telling us</ThemedText>
          <ThemedText themeColor="textSecondary">
            Your report is private. We&apos;ll review it and take action if it breaks the community
            guidelines.{userId ? ' You can also block this person from their profile.' : ''}
          </ThemedText>
          <PrimaryButton label="Done" onPress={() => router.back()} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText themeColor="textSecondary">
          {activityId ? "What's wrong with this activity?" : "What's going on?"} The person won&apos;t
          know you reported them.
        </ThemedText>

        <View style={styles.reasons}>
          {(Object.keys(REASONS) as Reason[]).map((key) => (
            <Chip
              key={key}
              label={REASONS[key]}
              selected={reason === key}
              onPress={() => setReason(key)}
            />
          ))}
        </View>

        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Tell us more (optional)"
          placeholderTextColor={theme.textSecondary}
          multiline
          maxLength={1000}
          value={details}
          onChangeText={setDetails}
        />

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <PrimaryButton label="Send report" onPress={send} busy={busy} dimmed={!reason} />
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
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  input: {
    minHeight: 100,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  error: {
    color: '#e5484d',
  },
});
