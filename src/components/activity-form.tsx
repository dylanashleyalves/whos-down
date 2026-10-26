import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  Audiences,
  Categories,
  fetchNextPostTime,
  formatDay,
  formatTime,
  type ActivityWithPeople,
  type Audience,
  type Category,
} from '@/lib/activities';
import { formatCountry } from '@/lib/countries';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const DAYS_AHEAD = 7;
const FIRST_HOUR = 6;

function nextDays() {
  return Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + i);
    return day;
  });
}

// Half-hour slots from 6:00 to 23:30, skipping times that have already passed today.
function timeSlots(day: Date) {
  const now = new Date();
  const slots: Date[] = [];
  for (let minutes = FIRST_HOUR * 60; minutes < 24 * 60; minutes += 30) {
    const slot = new Date(day);
    slot.setHours(0, minutes, 0, 0);
    if (slot > now) slots.push(slot);
  }
  return slots;
}

function initialDayIndex(days: Date[], existing: Date | null) {
  if (existing) {
    const index = days.findIndex((day) => day.toDateString() === existing.toDateString());
    if (index >= 0) return index;
  }
  // Start on today, or tomorrow if it's too late for any slots today.
  return timeSlots(days[0]).length > 0 ? 0 : 1;
}

type ActivityFormProps = {
  // When given, the form edits this activity instead of posting a new one.
  existing?: ActivityWithPeople;
};

export function ActivityForm({ existing }: ActivityFormProps) {
  const theme = useTheme();
  const { session, profile, privateProfile } = useAuth();
  // Hosts can make an activity just for their own gender, or open it to everyone.
  const audiences: Audience[] =
    privateProfile?.gender === 'guy'
      ? ['everyone', 'guys']
      : privateProfile?.gender === 'girl'
        ? ['everyone', 'girls']
        : ['everyone'];
  const days = useMemo(() => nextDays(), []);
  const existingStart = existing ? new Date(existing.starts_at) : null;
  // Can't drop below the number of people who already joined.
  const minSpots = Math.max(1, existing?.members.length ?? 0);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [category, setCategory] = useState<Category>(existing?.category ?? 'sports');
  const [audience, setAudience] = useState<Audience>(existing?.audience ?? 'everyone');
  const [location, setLocation] = useState(existing?.location ?? '');
  const [dayIndex, setDayIndex] = useState(() => initialDayIndex(days, existingStart));
  const [startsAt, setStartsAt] = useState<Date | null>(
    () => existingStart ?? timeSlots(days[dayIndex])[0] ?? null
  );
  const [spots, setSpots] = useState(existing?.spots ?? 3);
  const [details, setDetails] = useState(existing?.details ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the one-post-a-day limit applies to a new post.
  const [nextPostAt, setNextPostAt] = useState<Date | null>(null);

  const userId = session?.user.id;
  useEffect(() => {
    if (existing || !userId) return;
    fetchNextPostTime(userId).then(setNextPostAt);
  }, [existing, userId]);

  const slots = useMemo(() => timeSlots(days[dayIndex]), [days, dayIndex]);
  const canPost =
    !nextPostAt && title.trim().length >= 3 && location.trim().length >= 2 && startsAt !== null;
  const limitMessage = nextPostAt
    ? `You can post one activity a day. You can post again ${formatDay(nextPostAt).toLowerCase()} at ${formatTime(nextPostAt)}.`
    : null;

  async function post() {
    if (limitMessage) {
      setError(limitMessage);
      return;
    }

    const missing = [
      title.trim().length < 3 && 'what you\'re doing (3+ characters)',
      location.trim().length < 2 && 'where',
      !startsAt && 'a time',
    ].filter(Boolean);
    if (missing.length > 0 || !startsAt) {
      setError(`Add ${missing.join(', ')}.`);
      return;
    }

    setBusy(true);
    setError(null);

    const fields = {
      title: title.trim(),
      category,
      audience,
      location: location.trim(),
      starts_at: startsAt.toISOString(),
      spots,
      details: details.trim() || null,
    };
    const { error } = existing
      ? await supabase.from('activities').update(fields).eq('id', existing.id)
      : await supabase.from('activities').insert(fields);

    setBusy(false);
    if (error) {
      setError(error.message);
    } else {
      router.back();
    }
  }

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {limitMessage && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText type="small">⏳ {limitMessage}</ThemedText>
            </ThemedView>
          )}

          <Field label="What are you doing?">
            <TextInput
              style={inputStyle}
              placeholder="Pickup basketball, need 4 more"
              placeholderTextColor={theme.textSecondary}
              maxLength={80}
              value={title}
              onChangeText={setTitle}
            />
          </Field>

          <Field label="Category">
            <View style={styles.wrap}>
              {(Object.keys(Categories) as Category[]).map((key) => (
                <Chip
                  key={key}
                  label={`${Categories[key].emoji} ${Categories[key].label}`}
                  selected={category === key}
                  onPress={() => setCategory(key)}
                />
              ))}
            </View>
          </Field>

          {audiences.length > 1 && (
            <Field label="Who's it for?">
              <View style={styles.wrap}>
                {audiences.map((key) => (
                  <Chip
                    key={key}
                    label={`${Audiences[key].emoji} ${Audiences[key].label}`}
                    selected={audience === key}
                    onPress={() => setAudience(key)}
                  />
                ))}
              </View>
            </Field>
          )}

          <Field label="Where?">
            <TextInput
              style={inputStyle}
              placeholder="Park, gym, café, venue or address"
              placeholderTextColor={theme.textSecondary}
              maxLength={120}
              value={location}
              onChangeText={setLocation}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Only people in {formatCountry(profile?.country) ?? 'your country'} will see this.
            </ThemedText>
          </Field>

          <Field label="When?">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {days.map((day, i) => (
                <Chip
                  key={day.toISOString()}
                  label={formatDay(day)}
                  selected={dayIndex === i}
                  onPress={() => {
                    setDayIndex(i);
                    setStartsAt(timeSlots(day)[0] ?? null);
                  }}
                />
              ))}
            </ScrollView>
            {slots.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No times left today. Pick another day.
              </ThemedText>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {slots.map((slot) => (
                  <Chip
                    key={slot.toISOString()}
                    label={formatTime(slot)}
                    selected={startsAt?.getTime() === slot.getTime()}
                    onPress={() => setStartsAt(slot)}
                  />
                ))}
              </ScrollView>
            )}
          </Field>

          <Field label="How many more people?">
            <View style={styles.stepper}>
              <StepButton label="−" disabled={spots <= minSpots} onPress={() => setSpots(spots - 1)} />
              <ThemedText type="subtitle" style={styles.spots}>
                {spots}
              </ThemedText>
              <StepButton label="+" disabled={spots >= 50} onPress={() => setSpots(spots + 1)} />
            </View>
          </Field>

          <Field label="Details (optional)">
            <TextInput
              style={[inputStyle, styles.multiline]}
              placeholder="Skill level, what to bring, etc."
              placeholderTextColor={theme.textSecondary}
              multiline
              maxLength={500}
              value={details}
              onChangeText={setDetails}
            />
          </Field>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <Pressable
            disabled={busy}
            onPress={post}
            style={({ pressed }) => [pressed && styles.pressed, (!canPost || busy) && styles.disabled]}>
            <View style={styles.postButton}>
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText type="smallBold" style={styles.postLabel}>
                  {existing ? 'Save changes' : 'Post activity'}
                </ThemedText>
              )}
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
    </View>
  );
}

function StepButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled]}>
      <ThemedView type="backgroundElement" style={styles.stepButton}>
        <ThemedText type="subtitle">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  row: {
    gap: Spacing.two,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spots: {
    minWidth: 40,
    textAlign: 'center',
  },
  error: {
    color: '#e5484d',
  },
  notice: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  postButton: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  postLabel: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
