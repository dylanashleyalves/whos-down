import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const DAY_MS = 24 * 60 * 60 * 1000;
// Counts as quiet after this long without posting or joining anything.
const QUIET_AFTER_MS = 7 * DAY_MS;
// After "Not now", wait this long before asking again.
const SNOOZE_MS = 3 * DAY_MS;
const SNOOZE_KEY = 'quietReminderSnoozedAt';

// When the user last posted or joined an activity (or signed up, if never).
async function lastActiveAt(userId: string, signedUpAt: string) {
  const [hosted, joined] = await Promise.all([
    supabase
      .from('activities')
      .select('created_at')
      .eq('host_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('activity_members')
      .select('joined_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const times = [signedUpAt, hosted.data?.created_at, joined.data?.joined_at]
    .filter((t): t is string => typeof t === 'string')
    .map((t) => new Date(t).getTime());
  return Math.max(...times);
}

// A friendly nudge on the Feed for people who haven't been out in a while.
export function QuietReminder() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const signedUpAt = profile?.created_at;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!userId || !signedUpAt) return;
    let active = true;
    Promise.all([lastActiveAt(userId, signedUpAt), AsyncStorage.getItem(SNOOZE_KEY)]).then(
      ([last, snoozedAt]) => {
        const quiet = Date.now() - last > QUIET_AFTER_MS;
        const snoozed = snoozedAt !== null && Date.now() - Number(snoozedAt) < SNOOZE_MS;
        if (active) setShow(quiet && !snoozed);
      }
    );
    return () => {
      active = false;
    };
  }, [userId, signedUpAt]);

  if (!show) return null;

  function snooze() {
    setShow(false);
    AsyncStorage.setItem(SNOOZE_KEY, String(Date.now()));
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">👋 Been quiet lately?</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        It&apos;s been over a week since you got out. Ask people out: a game, a gym session or
        some food. Someone nearby is probably down.
      </ThemedText>
      <View style={styles.actions}>
        <Pressable onPress={() => router.push('/new-activity')}>
          <ThemedText type="linkPrimary">Post an activity</ThemedText>
        </Pressable>
        <Pressable onPress={snooze}>
          <ThemedText type="link" themeColor="textSecondary">
            Not now
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: '#3c87f7',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
});
