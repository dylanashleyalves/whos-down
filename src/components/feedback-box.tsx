import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/lib/toast';

// Lets testers tell us what's confusing or broken, straight from the app.
export function FeedbackBox() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('feedback').insert({ body: body.trim() });
    setBusy(false);
    if (error) {
      setError(
        error.message.includes('row-level security')
          ? "You've sent a lot of feedback today. Thank you! Try again tomorrow."
          : error.message
      );
      return;
    }
    setBody('');
    setOpen(false);
    showToast('Thanks! Your feedback was sent 🙏');
  }

  if (!open) {
    return (
      <PrimaryButton label="💡 Send feedback" variant="secondary" onPress={() => setOpen(true)} />
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">What could be better?</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Anything confusing, broken or missing. Only the Who&apos;s Down team sees this.
      </ThemedText>
      <TextInput
        style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
        placeholder="e.g. I couldn't find how to…"
        placeholderTextColor={theme.textSecondary}
        multiline
        maxLength={2000}
        value={body}
        onChangeText={setBody}
      />
      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}
      <View style={styles.actions}>
        <PrimaryButton
          label="Send"
          busy={busy}
          dimmed={!body.trim()}
          onPress={() => body.trim() && send()}
        />
        <PrimaryButton label="Cancel" variant="secondary" onPress={() => setOpen(false)} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    minHeight: 96,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  error: {
    color: '#e5484d',
  },
  actions: {
    gap: Spacing.two,
  },
});
