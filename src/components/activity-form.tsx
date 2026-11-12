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
import { LocationField } from '@/components/location-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  Audiences,
  Categories,
  fetchMeetupNote,
  fetchNextPostTime,
  formatDay,
  formatTime,
  saveMeetupNote,
  type ActivityWithPeople,
  type Audience,
  type Category,
} from '@/lib/activities';
import { formatCountry } from '@/lib/countries';
import { peopleDown, SPOTS_FOR_SIZE, type IdeaWithPeople, type Timing } from '@/lib/ideas';
import { displayName } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/lib/toast';
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

// How much notice a new post needs, so people have time to see it before it starts.
const MIN_NOTICE_MS = 30 * 60 * 1000;
// Hosting an idea needs more: everyone who was down gets told and needs time to say yes.
const IDEA_NOTICE_MS = 3 * 60 * 60 * 1000;

// Half-hour slots from 6:00 to 23:30, from `notice` after now.
function timeSlots(day: Date, notice: number) {
  const earliest = Date.now() + notice;
  const slots: Date[] = [];
  for (let minutes = FIRST_HOUR * 60; minutes < 24 * 60; minutes += 30) {
    const slot = new Date(day);
    slot.setHours(0, minutes, 0, 0);
    if (slot.getTime() >= earliest) slots.push(slot);
  }
  return slots;
}

// A first guess at when to host an idea, from when its people said suits them.
function ideaStart(days: Date[], timing: Timing, notice: number) {
  const at = (hour: number, fits: (day: Date) => boolean) =>
    days
      .filter(fits)
      .flatMap((day) => timeSlots(day, notice))
      .find((slot) => slot.getHours() === hour && slot.getMinutes() === 0) ?? null;
  const weekend = (day: Date) => day.getDay() === 0 || day.getDay() === 6;
  switch (timing) {
    case 'weekends':
      return at(10, weekend);
    case 'weekday_evenings':
      return at(19, (day) => !weekend(day));
    case 'next_week':
      return at(19, (day) => day.getDay() === 1 && day > days[0]);
    default:
      return at(19, (day) => day > days[0]);
  }
}

// The day and time the form starts on.
function initialStart(days: Date[], existing: Date | null, fromIdea: Timing | null) {
  const notice = fromIdea ? IDEA_NOTICE_MS : MIN_NOTICE_MS;
  const guess =
    existing ??
    (fromIdea ? ideaStart(days, fromIdea, notice) : null) ??
    days.flatMap((day) => timeSlots(day, notice))[0] ??
    null;
  const index = guess ? days.findIndex((day) => day.toDateString() === guess.toDateString()) : -1;
  return { dayIndex: Math.max(index, 0), startsAt: guess };
}

// One-tap starting points, so a first post takes seconds. People still add where and when.
const QUICK_STARTS: { title: string; category: Category; spots: number; details?: string }[] = [
  {
    title: '🏀 Pickup basketball, need 4 more',
    category: 'sports',
    spots: 4,
    details: 'All levels welcome.',
  },
  {
    title: '🏋️ Gym session, looking for a buddy',
    category: 'gym',
    spots: 1,
    details: 'Any level, no pressure.',
  },
  {
    title: '☕ Coffee and a chat',
    category: 'hangout',
    spots: 2,
    details: 'No plan, just a chat. First-timers welcome.',
  },
  {
    title: '🚶 Easy walk and a chat',
    category: 'outdoors',
    spots: 2,
    details: 'Nice and relaxed. First-timers welcome.',
  },
  {
    title: '🍜 Supper run, who’s hungry?',
    category: 'food',
    spots: 3,
    details: 'Come as you are.',
  },
  {
    title: '🎮 Gaming night, need a squad',
    category: 'gaming',
    spots: 3,
    details: 'All skill levels welcome.',
  },
  {
    title: '🥾 Easy weekend hike',
    category: 'outdoors',
    spots: 4,
    details: 'Bring water and comfy shoes.',
  },
  {
    title: '🏸 Badminton doubles',
    category: 'sports',
    spots: 3,
    details: 'Just for fun, all levels welcome.',
  },
  {
    title: '🎳 Bowling or arcade',
    category: 'hangout',
    spots: 4,
    details: 'Being bad at it is half the fun.',
  },
];

type ActivityFormProps = {
  // When given, the form edits this activity instead of posting a new one.
  existing?: ActivityWithPeople;
  // When given, a new post that hosts this idea: filled in from it and linked to it.
  fromIdea?: IdeaWithPeople;
};

export function ActivityForm({ existing, fromIdea }: ActivityFormProps) {
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

  // Everyone down for the idea, apart from whoever is hosting it.
  const ideaPeople = fromIdea
    ? peopleDown(fromIdea).filter((person) => person.id !== session?.user.id)
    : [];

  const [title, setTitle] = useState(existing?.title ?? fromIdea?.title ?? '');
  const [category, setCategory] = useState<Category>(
    existing?.category ?? fromIdea?.category ?? 'sports'
  );
  const [audience, setAudience] = useState<Audience>(
    existing?.audience ?? fromIdea?.audience ?? 'everyone'
  );
  const [location, setLocation] = useState(existing?.location ?? fromIdea?.area ?? '');
  const notice = fromIdea ? IDEA_NOTICE_MS : MIN_NOTICE_MS;
  const [initial] = useState(() => initialStart(days, existingStart, fromIdea?.timing ?? null));
  const [dayIndex, setDayIndex] = useState(initial.dayIndex);
  const [startsAt, setStartsAt] = useState<Date | null>(initial.startsAt);
  const [spots, setSpots] = useState(
    () =>
      existing?.spots ??
      (fromIdea
        ? Math.min(50, Math.max(SPOTS_FOR_SIZE[fromIdea.group_size], ideaPeople.length))
        : 3)
  );
  const [details, setDetails] = useState(existing?.details ?? fromIdea?.note ?? '');
  // Null until an existing activity's note has loaded, so saving can't wipe it.
  const [note, setNote] = useState<string | null>(existing ? null : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the one-post-a-day limit applies to a new post.
  const [nextPostAt, setNextPostAt] = useState<Date | null>(null);

  const userId = session?.user.id;
  useEffect(() => {
    if (existing || !userId) return;
    fetchNextPostTime(userId).then(setNextPostAt);
  }, [existing, userId]);

  const existingId = existing?.id;
  useEffect(() => {
    if (!existingId) return;
    fetchMeetupNote(existingId).then(
      (saved) => setNote((current) => current ?? saved ?? ''),
      (e) => console.warn('Could not load the meetup note', e)
    );
  }, [existingId]);

  const slots = useMemo(() => timeSlots(days[dayIndex], notice), [days, dayIndex, notice]);
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
      title.trim().length < 3 && "what you're doing (3+ characters)",
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
    const { data, error } = existing
      ? await supabase.from('activities').update(fields).eq('id', existing.id).select('id').single()
      : await supabase.from('activities').insert(fields).select('id').single();

    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }

    // Link it to the idea, which tells everyone who was down. The activity is posted
    // either way, so a failure here (say someone else hosted it first) just gets a mention.
    let linked = true;
    if (fromIdea && !existing) {
      const { error: linkError } = await supabase.rpc('host_idea', {
        target_idea: fromIdea.id,
        target_activity: data.id,
      });
      if (linkError) {
        console.warn('Could not link the idea', linkError);
        linked = false;
      }
    }

    // The activity is saved by now, so a note that fails shouldn't stop them moving on.
    let noteSaved = true;
    if (note !== null && (existing || note.trim())) {
      try {
        await saveMeetupNote(data.id as string, note.trim());
      } catch (e) {
        console.warn('Could not save the meetup note', e);
        noteSaved = false;
      }
    }

    setBusy(false);
    if (!linked) {
      showToast("Posted! 🎉 But we couldn't tell the people from the idea. Share it with them.");
    } else if (fromIdea && !existing) {
      showToast(`Posted! 🎉 We've told the ${ideaPeople.length} people who were down`);
      router.replace(`/activity/${data.id}`);
      return;
    } else if (!noteSaved) {
      showToast('Saved, but "How to find us" didn’t. Try Edit activity.');
    } else {
      showToast(existing ? 'Changes saved ✓' : "Posted! 🎉 We'll let you know when people join");
    }
    router.back();
  }

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

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

          {fromIdea && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText type="smallBold">
                💡 Hosting{' '}
                {fromIdea.user_id === session?.user.id
                  ? 'your idea'
                  : `${displayName(fromIdea.poster)}'s idea`}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {ideaPeople.length > 0
                  ? `We filled this in from the idea. Pick a time and place, and the ${ideaPeople.length} ${ideaPeople.length === 1 ? 'person' : 'people'} who were down get invited to join.`
                  : 'We filled this in from the idea. Pick a time and place to make it real.'}
              </ThemedText>
            </ThemedView>
          )}

          {!existing && !fromIdea && (
            <Field label="Quick start">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}>
                {QUICK_STARTS.map((quick) => (
                  <Chip
                    key={quick.title}
                    label={quick.title}
                    color={Categories[quick.category].color}
                    selected={title === quick.title}
                    onPress={() => {
                      setTitle(quick.title);
                      setCategory(quick.category);
                      setSpots(quick.spots);
                      setDetails(quick.details ?? '');
                      setError(null);
                    }}
                  />
                ))}
              </ScrollView>
              <ThemedText type="small" themeColor="textSecondary">
                Tap one to fill in the form, then add where and when. Or write your own below.
              </ThemedText>
            </Field>
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
                  color={Categories[key].color}
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
            <LocationField
              value={location}
              onChange={setLocation}
              country={profile?.country ?? null}
              inputStyle={inputStyle}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Only people in {formatCountry(profile?.country) ?? 'your country'} will see this.
            </ThemedText>
          </Field>

          <Field label="When?">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.row}>
              {days.map((day, i) => (
                <Chip
                  key={day.toISOString()}
                  label={formatDay(day)}
                  selected={dayIndex === i}
                  onPress={() => {
                    setDayIndex(i);
                    setStartsAt(timeSlots(day, notice)[0] ?? null);
                  }}
                />
              ))}
            </ScrollView>
            {slots.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {fromIdea
                  ? "Hosted ideas need 3 hours' notice. Pick another day."
                  : 'No times left today. Pick another day.'}
              </ThemedText>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}>
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
            {fromIdea && (
              <ThemedText type="small" themeColor="textSecondary">
                At least 3 hours from now, so everyone who was down has time to see it and join.
              </ThemedText>
            )}
          </Field>

          <Field label="How many more people?">
            <View style={styles.stepper}>
              <StepButton
                label="−"
                disabled={spots <= minSpots}
                onPress={() => setSpots(spots - 1)}
              />
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

          <Field label="How to find us (optional)">
            <TextInput
              style={inputStyle}
              placeholder="Blue shirt, by the main entrance"
              placeholderTextColor={theme.textSecondary}
              maxLength={120}
              value={note ?? ''}
              onChangeText={setNote}
            />
            <ThemedText type="small" themeColor="textSecondary">
              🔒 Only people who join can see this.
            </ThemedText>
          </Field>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <Pressable
            disabled={busy}
            onPress={post}
            style={({ pressed }) => [
              pressed && styles.pressed,
              (!canPost || busy) && styles.disabled,
            ]}>
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
          {!existing && !limitMessage && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              You can post one activity a day, so make it a good one.
            </ThemedText>
          )}
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

function StepButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
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
  center: {
    textAlign: 'center',
  },
  notice: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  postButton: {
    backgroundColor: Brand.blue,
    backgroundImage: Brand.gradient,
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
