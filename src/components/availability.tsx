import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Pill } from '@/components/pill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { currentStatus, STATUSES, statusUntil, type Status } from '@/lib/availability';
import type { Profile } from '@/lib/profiles';
import { showToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type AvailabilityProps = {
  profile: Pick<Profile, 'status' | 'status_until'> | null;
};

// Someone's status, like "🟢 Free now". Hidden if it isn't set.
export function Availability({ profile }: AvailabilityProps) {
  const status = currentStatus(profile);
  if (!status) return null;

  return (
    <Pill
      size="medium"
      bold
      color={STATUSES[status].color}
      label={`${STATUSES[status].emoji} ${STATUSES[status].label}`}
    />
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
    else if (next === 'free_now' || next === 'free_tonight')
      showToast(`${STATUSES[next].emoji} Status set. We'll let your crew know`);
    else if (next) showToast(`${STATUSES[next].emoji} Status set`);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Your status</ThemedText>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
