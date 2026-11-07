import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Chip } from '@/components/chip';
import { IdeaCard } from '@/components/idea-card';
import { LocationField } from '@/components/location-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Audiences, Categories, type Audience, type Category } from '@/lib/activities';
import { formatCountry } from '@/lib/countries';
import {
  GroupSizes,
  IDEA_READY_AT,
  MAX_OPEN_IDEAS,
  Timings,
  type GroupSize,
  type IdeaWithPeople,
  type Timing,
} from '@/lib/ideas';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/lib/toast';
import { useAuth } from '@/providers/auth-provider';

// Tap one to start, then change anything.
const QUICK_IDEAS: { title: string; category: Category; timing: Timing; size: GroupSize }[] = [
  { title: '🏸 Badminton, any level', category: 'sports', timing: 'weekends', size: 'small' },
  { title: '🍲 Trying a new hotpot place', category: 'food', timing: 'flexible', size: 'medium' },
  { title: '🥾 A sunrise hike', category: 'outdoors', timing: 'weekends', size: 'not_sure' },
  { title: '🎤 Karaoke night', category: 'hangout', timing: 'weekday_evenings', size: 'big' },
  { title: '🏋️ A regular gym buddy', category: 'gym', timing: 'weekday_evenings', size: 'small' },
  { title: '🎲 Board games café', category: 'gaming', timing: 'this_week', size: 'medium' },
  { title: '⚽ Casual futsal', category: 'sports', timing: 'flexible', size: 'big' },
];

const STEPS = [
  { emoji: '💡', text: 'Share an idea. No time or place needed, and "not sure" is fine.' },
  { emoji: '🙌', text: 'People nearby tap "I\'m down too". You get a ping for each one.' },
  {
    emoji: '🔥',
    text: `When ${IDEA_READY_AT} of you are keen, everyone gets told it's time to plan.`,
  },
  {
    emoji: '📅',
    text: 'Anyone keen taps "Host it" and picks a time and place. Everyone who was down is invited.',
  },
];

export function IdeaForm() {
  const theme = useTheme();
  const { session, profile, privateProfile } = useAuth();
  const audiences: Audience[] =
    privateProfile?.gender === 'guy'
      ? ['everyone', 'guys']
      : privateProfile?.gender === 'girl'
        ? ['everyone', 'girls']
        : ['everyone'];

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('hangout');
  const [area, setArea] = useState('');
  const [timing, setTiming] = useState<Timing>('flexible');
  const [size, setSize] = useState<GroupSize>('not_sure');
  const [audience, setAudience] = useState<Audience>('everyone');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPost = title.trim().length >= 3;

  // What the card will look like on the feed, updated as they type.
  const draft: IdeaWithPeople = {
    id: 'preview',
    user_id: session?.user.id ?? 'me',
    title: title.trim() || 'Your idea',
    category,
    area: area.trim() || null,
    timing,
    group_size: size,
    note: note.trim() || null,
    audience,
    activity_id: null,
    created_at: new Date().toISOString(),
    expires_at: new Date().toISOString(),
    poster: profile
      ? { id: profile.id, display_name: profile.display_name, avatar_url: profile.avatar_url }
      : null,
    interest: [],
  };

  async function share() {
    if (!canPost) {
      setError("Add what you'd be down for (3+ characters).");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('ideas').insert({
      title: title.trim(),
      category,
      area: area.trim() || null,
      timing,
      group_size: size,
      audience,
      note: note.trim() || null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    showToast("💡 Idea shared! We'll tell you when people are down");
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
          <ThemedView type="backgroundElement" style={styles.guide}>
            <ThemedText type="smallBold">How it works</ThemedText>
            {STEPS.map((step) => (
              <View key={step.emoji} style={styles.step}>
                <ThemedText style={styles.stepEmoji}>{step.emoji}</ThemedText>
                <ThemedText type="small" style={styles.grow}>
                  {step.text}
                </ThemedText>
              </View>
            ))}
          </ThemedView>

          <Field label="Need ideas?">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.row}>
              {QUICK_IDEAS.map((quick) => (
                <Chip
                  key={quick.title}
                  label={quick.title}
                  color={Categories[quick.category].color}
                  selected={title === quick.title}
                  onPress={() => {
                    setTitle(quick.title);
                    setCategory(quick.category);
                    setTiming(quick.timing);
                    setSize(quick.size);
                    setError(null);
                  }}
                />
              ))}
            </ScrollView>
          </Field>

          <Field label="What would you be down for?">
            <TextInput
              style={inputStyle}
              placeholder="Trying that new ramen place"
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

          <Field label="When works?">
            <View style={styles.wrap}>
              {(Object.keys(Timings) as Timing[]).map((key) => (
                <Chip
                  key={key}
                  label={`${Timings[key].emoji} ${Timings[key].label}`}
                  selected={timing === key}
                  onPress={() => setTiming(key)}
                />
              ))}
            </View>
          </Field>

          <Field label="How big a group?">
            <View style={styles.wrap}>
              {(Object.keys(GroupSizes) as GroupSize[]).map((key) => (
                <Chip
                  key={key}
                  label={`${GroupSizes[key].emoji} ${GroupSizes[key].label}`}
                  selected={size === key}
                  onPress={() => setSize(key)}
                />
              ))}
            </View>
          </Field>

          <Field label="Roughly where? (optional)">
            <LocationField
              value={area}
              onChange={setArea}
              country={profile?.country ?? null}
              inputStyle={inputStyle}
            />
            <ThemedText type="small" themeColor="textSecondary">
              An area is enough, like &quot;Tampines&quot; or &quot;anywhere central&quot;.
            </ThemedText>
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

          <Field label="Anything else? (optional)">
            <TextInput
              style={[inputStyle, styles.multiline]}
              placeholder="Total beginner, keen to learn!"
              placeholderTextColor={theme.textSecondary}
              multiline
              maxLength={300}
              value={note}
              onChangeText={setNote}
            />
          </Field>

          <Field label="Preview">
            <IdeaCard idea={draft} myId={draft.user_id} onPress={null} />
            <ThemedText type="small" themeColor="textSecondary">
              This is how people in {formatCountry(profile?.country) ?? 'your country'} will see it
              on Discover.
            </ThemedText>
          </Field>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <PrimaryButton label="💡 Share my idea" busy={busy} dimmed={!canPost} onPress={share} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            You can have {MAX_OPEN_IDEAS} ideas up at a time. Each one stays up for 14 days or until
            someone hosts it.
          </ThemedText>
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
  guide: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    borderLeftWidth: 4,
    borderLeftColor: Brand.purple,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  stepEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  grow: {
    flex: 1,
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
    minHeight: 80,
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
  error: {
    color: '#e5484d',
  },
  center: {
    textAlign: 'center',
  },
});
