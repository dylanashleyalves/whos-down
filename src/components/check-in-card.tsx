import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { isCheckInOpen, type ActivityWithPeople } from '@/lib/activities';
import { displayName } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

type CheckInCardProps = {
  activity: ActivityWithPeople;
  myId: string | undefined;
  // Called after the host saves, so the screen can reload.
  onSaved: () => void;
};

// After an activity starts: the host marks who showed up (that's what earns XP),
// and members see how they were marked.
export function CheckInCard({ activity, myId, onSaved }: CheckInCardProps) {
  const isHost = activity.host_id === myId;
  // Who the host has marked as there. Before the first check-in, everyone is ticked.
  const [present, setPresent] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from('activity_attendance')
      .select('user_id, attended')
      .eq('activity_id', activity.id)
      .then(({ data }) => {
        if (!active) return;
        const rows = (data ?? []) as { user_id: string; attended: boolean }[];
        setPresent(
          rows.length > 0
            ? new Set(rows.filter((r) => r.attended).map((r) => r.user_id))
            : new Set(activity.members.map((m) => m.user_id))
        );
      });
    return () => {
      active = false;
    };
  }, [activity.id, activity.members]);

  if (!present || activity.members.length === 0) return null;

  const windowOpen = isCheckInOpen(activity);
  const checkedIn = !!activity.checked_in_at;

  // Members: just show how the host marked them.
  if (!isHost) {
    if (!checkedIn || !myId) return null;
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">
          {present.has(myId) ? '✓ The host checked you in' : '❌ The host marked you as a no-show'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {present.has(myId)
            ? 'This meetup counts towards your rank.'
            : 'No-shows lose XP. If this is wrong, message the host in the group chat.'}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!windowOpen && !checkedIn) return null;

  function toggle(userId: string) {
    const next = new Set(present);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setPresent(next);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc('host_check_in', {
      target_activity: activity.id,
      attended_ids: [...(present ?? [])],
    });
    setBusy(false);
    if (error) setError(error.message);
    else onSaved();
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{checkedIn ? '✓ Checked in' : '📋 Who showed up?'}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {checkedIn
          ? `${present.size} of ${activity.members.length} came.${windowOpen ? ' You can still change it this week.' : ''}`
          : 'Untick anyone who didn’t come. Meetups with at least 2 people count towards everyone’s rank, and no-shows lose XP.'}
      </ThemedText>

      {windowOpen &&
        activity.members.map((member) => {
          const here = present.has(member.user_id);
          return (
            <Pressable
              key={member.user_id}
              onPress={() => toggle(member.user_id)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Avatar profile={member.profile} size={32} />
              <ThemedText type="small" style={styles.name}>
                {displayName(member.profile)}
              </ThemedText>
              <View style={[styles.check, here && styles.checkOn]}>
                <ThemedText type="smallBold" style={here && styles.white}>
                  {here ? '✓' : ''}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      {windowOpen && (
        <PrimaryButton
          label={checkedIn ? 'Update check-in' : 'Confirm who came'}
          variant={checkedIn ? 'secondary' : 'primary'}
          busy={busy}
          onPress={save}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  name: {
    flex: 1,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#3c87f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: Brand.blue,
    backgroundImage: Brand.gradient,
  },
  white: {
    color: '#ffffff',
  },
  error: {
    color: '#e5484d',
  },
  pressed: {
    opacity: 0.7,
  },
});
