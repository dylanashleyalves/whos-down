import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Pill } from '@/components/pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { currentStatus, FREE_TIMES, STATUSES, statusUntil, type Status } from '@/lib/availability';
import type { Profile } from '@/lib/profiles';
import { showToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type AvailabilityProps = {
  profile: Pick<Profile, 'status' | 'status_until' | 'free_times'> | null;
};

// Someone's status ("🟢 Free now") and when they're usually free. Hidden if neither is set.
export function Availability({ profile }: AvailabilityProps) {
  const status = currentStatus(profile);
  const freeTimes = profile?.free_times ?? [];
  if (!status && freeTimes.length === 0) return null;

  return (
    <View style={styles.container}>
      {status && (
        <Pill
          size="medium"
          bold
          color={STATUSES[status].color}
          label={`${STATUSES[status].emoji} ${STATUSES[status].label}`}
        />
      )}
      {freeTimes.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Usually free: {freeTimes.map((key) => FREE_TIMES[key].toLowerCase()).join(', ')}
        </ThemedText>
      )}
    </View>
  );
}

// On your own profile: set a quick status. Tap the selected one again to clear it.
export function StatusPicker() {
  const { profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const status = currentStatus(profile);

  async function choose(next: Status | null) {
    if (!profile || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ status: next, status_until: next ? statusUntil(next) : null })
      .eq('id', profile.id);
    await refreshProfile();
    setBusy(false);
    if (error) showToast('Could not update your status');
    else if (next === 'busy') showToast("🔴 Got it. We'll hold new-activity alerts today");
    else if (next) showToast(`${STATUSES[next].emoji} Status set`);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">What&apos;s your status?</ThemedText>
      <View style={styles.chips}>
        {(Object.keys(STATUSES) as Status[]).map((key) => (
          <Chip
            key={key}
            label={`${STATUSES[key].emoji} ${STATUSES[key].label}`}
            color={STATUSES[key].color}
            selected={status === key}
            onPress={() => choose(status === key ? null : key)}
          />
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Shows on your profile and clears itself. Set when you&apos;re usually free in Edit profile.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
