import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Avatar } from '@/components/avatar';
import { Chip } from '@/components/chip';
import { CountryPicker } from '@/components/country-picker';
import { GuidelinesList } from '@/components/guidelines-list';
import { PrimaryButton } from '@/components/primary-button';
import { SocialIcon } from '@/components/social-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Categories, type Category } from '@/lib/activities';
import { FREE_TIMES, type FreeTime } from '@/lib/availability';
import { hasContactDetails } from '@/lib/contact-details';
import { deviceCountry } from '@/lib/countries';
import { ageOn, GENDERS, MIN_AGE, parseBirthdate, uploadAvatar, type Gender } from '@/lib/profiles';
import {
  cleanHandle,
  fetchSocials,
  isValidHandle,
  saveSocials,
  SOCIAL_KEYS,
  SOCIALS,
  type SocialKey,
  type Socials,
} from '@/lib/socials';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const BIO_CONTACT_MESSAGE =
  'Keep handles, links and phone numbers out of your bio. You can add socials in Edit profile, where only your crew can see them.';

type ProfileFormProps = {
  header?: ReactNode;
  submitLabel: string;
  onSaved: () => void;
};

export function ProfileForm({ header, submitLabel, onSaved }: ProfileFormProps) {
  const theme = useTheme();
  const { session, profile, privateProfile, refreshProfile } = useAuth();
  // Birthday, guidelines and gender are asked once, during setup.
  const needsSetup = !privateProfile;
  const needsGender = !privateProfile?.gender;

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [country, setCountry] = useState<string | null>(profile?.country ?? deviceCountry());
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [city, setCity] = useState(profile?.city ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [interests, setInterests] = useState<Category[]>(profile?.interests ?? []);
  const [freeTimes, setFreeTimes] = useState<FreeTime[]>(profile?.free_times ?? []);
  const [socials, setSocials] = useState<Partial<Record<SocialKey, string>>>({});
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;
  const bioHasContact = hasContactDetails(bio);

  // Socials are for your crew, so they're added later from Edit profile, not during setup.
  useEffect(() => {
    if (needsSetup || !userId) return;
    fetchSocials(userId).then((saved) => {
      if (saved) setSocials(saved as Partial<Record<SocialKey, string>>);
    });
  }, [needsSetup, userId]);

  const preview = {
    display_name: displayName,
    avatar_url: photo?.uri ?? profile?.avatar_url ?? null,
  };

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) setPhoto(result.assets[0]);
  }

  function toggleInterest(key: Category) {
    setInterests(
      interests.includes(key) ? interests.filter((item) => item !== key) : [...interests, key]
    );
  }

  function toggleFreeTime(key: FreeTime) {
    setFreeTimes(
      freeTimes.includes(key) ? freeTimes.filter((item) => item !== key) : [...freeTimes, key]
    );
  }

  async function save() {
    if (!userId) return;
    if (displayName.trim().length < 2) {
      setError('Add your first name (2+ characters).');
      return;
    }
    if (!country) {
      setError('Pick your country.');
      return;
    }
    if (needsGender && !gender) {
      setError('Choose whether you’re a guy or a girl, or prefer not to say.');
      return;
    }

    if (bioHasContact) {
      setError(BIO_CONTACT_MESSAGE);
      return;
    }
    const handles = {} as Socials;
    for (const key of SOCIAL_KEYS) {
      const handle = cleanHandle(key, socials[key] ?? '');
      if (handle && !isValidHandle(key, handle)) {
        setError(SOCIALS[key].problem);
        return;
      }
      handles[key] = handle || null;
    }

    const birthdate = parseBirthdate(birthDay, birthMonth, birthYear);
    if (needsSetup) {
      if (!birthdate || birthdate > new Date()) {
        setError('Add your real date of birth.');
        return;
      }
      if (ageOn(birthdate) < MIN_AGE) {
        setError(`You must be ${MIN_AGE} or older to use Who's Down.`);
        return;
      }
      if (!agreed) {
        setError('Agree to the community guidelines to continue.');
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      if (photo && !photo.base64) throw new Error('That photo could not be read. Try another one.');
      const avatarUrl = photo?.base64
        ? await uploadAvatar(userId, photo.base64, photo.mimeType)
        : (profile?.avatar_url ?? null);

      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        display_name: displayName.trim(),
        city: city.trim() || null,
        country,
        bio: bio.trim() || null,
        interests,
        free_times: freeTimes,
        avatar_url: avatarUrl,
      });
      if (error) throw error;

      if (needsSetup && birthdate) {
        const { error } = await supabase.from('profile_private').upsert({
          id: userId,
          birthdate: birthdate.toISOString().slice(0, 10),
          gender,
        });
        if (error) throw error;
      } else if (needsGender) {
        const { error } = await supabase
          .from('profile_private')
          .update({ gender })
          .eq('id', userId);
        if (error) throw error;
      }

      if (!needsSetup) {
        await saveSocials(userId, handles);
      }

      await refreshProfile();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
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
          {header}

          <Pressable onPress={pickPhoto} style={styles.photo}>
            <Avatar profile={preview} size={96} />
            <ThemedText type="linkPrimary">
              {preview.avatar_url ? 'Change photo' : 'Add a photo'}
            </ThemedText>
          </Pressable>

          <Field label="First name">
            <TextInput
              style={inputStyle}
              placeholder="Your first name"
              placeholderTextColor={theme.textSecondary}
              autoComplete="given-name"
              maxLength={40}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </Field>

          <Field label="Country">
            <CountryPicker value={country} onChange={setCountry} />
            <ThemedText type="small" themeColor="textSecondary">
              You&apos;ll see and join activities from this country only.
            </ThemedText>
          </Field>

          <Field label="Where are you based?">
            <TextInput
              style={inputStyle}
              placeholder="Your city, town, area or neighbourhood"
              placeholderTextColor={theme.textSecondary}
              maxLength={60}
              value={city}
              onChangeText={setCity}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Write it the way locals would, like your neighbourhood, area or city.
            </ThemedText>
          </Field>

          <Field label="What are you into?">
            <View style={styles.wrap}>
              {(Object.keys(Categories) as Category[]).map((key) => (
                <Chip
                  key={key}
                  label={`${Categories[key].emoji} ${Categories[key].label}`}
                  color={Categories[key].color}
                  selected={interests.includes(key)}
                  onPress={() => toggleInterest(key)}
                />
              ))}
            </View>
          </Field>

          <Field label="When are you usually free? (optional)">
            <View style={styles.wrap}>
              {(Object.keys(FREE_TIMES) as FreeTime[]).map((key) => (
                <Chip
                  key={key}
                  label={FREE_TIMES[key]}
                  selected={freeTimes.includes(key)}
                  onPress={() => toggleFreeTime(key)}
                />
              ))}
            </View>
          </Field>

          <Field label="About you (optional)">
            <TextInput
              style={[inputStyle, styles.multiline]}
              placeholder="New to the area, play ball on weekends, always up for food."
              placeholderTextColor={theme.textSecondary}
              multiline
              maxLength={200}
              value={bio}
              onChangeText={setBio}
            />
            {bioHasContact && (
              <ThemedText type="small" style={styles.bioWarning}>
                {BIO_CONTACT_MESSAGE}
              </ThemedText>
            )}
          </Field>

          {!needsSetup && (
            <Field label="Socials (optional)">
              {SOCIAL_KEYS.map((key) => (
                <View key={key} style={styles.socialRow}>
                  <SocialIcon name={key} size={28} />
                  <TextInput
                    style={[inputStyle, styles.socialInput]}
                    placeholder={SOCIALS[key].placeholder}
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={200}
                    value={socials[key] ?? ''}
                    onChangeText={(text) => setSocials((current) => ({ ...current, [key]: text }))}
                  />
                </View>
              ))}
              <ThemedText type="small" themeColor="textSecondary">
                🔒 Only your crew can see these: people you&apos;ve met who also tapped &quot;Hang
                again?&quot;.
              </ThemedText>
            </Field>
          )}

          {needsGender && (
            <Field label="I am a">
              <View style={styles.wrap}>
                {(Object.keys(GENDERS) as Gender[]).map((key) => (
                  <Chip
                    key={key}
                    label={GENDERS[key]}
                    selected={gender === key}
                    onPress={() => setGender(key)}
                  />
                ))}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                Only you can see this. It decides whether you see guys-only or girls-only
                activities. Everyone sees activities open to all.
              </ThemedText>
            </Field>
          )}

          {needsSetup && (
            <>
              <Field label="Date of birth">
                <View style={styles.dateRow}>
                  <TextInput
                    style={[inputStyle, styles.dateInput]}
                    placeholder="Day"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={birthDay}
                    onChangeText={setBirthDay}
                  />
                  <TextInput
                    style={[inputStyle, styles.dateInput]}
                    placeholder="Month"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={birthMonth}
                    onChangeText={setBirthMonth}
                  />
                  <TextInput
                    style={[inputStyle, styles.yearInput]}
                    placeholder="Year"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={birthYear}
                    onChangeText={setBirthYear}
                  />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  Only you can see this. You must be {MIN_AGE} or older.
                </ThemedText>
              </Field>

              <View style={styles.agreeRow}>
                <Checkbox
                  checked={agreed}
                  onToggle={() => setAgreed(!agreed)}
                  label="I agree to the community guidelines"
                />
                <Pressable onPress={() => setShowGuidelines(!showGuidelines)}>
                  <ThemedText type="linkPrimary">
                    {showGuidelines ? 'Hide' : 'Read them'}
                  </ThemedText>
                </Pressable>
              </View>

              {/* Shown in place, so leaving the form never loses what was typed. */}
              {showGuidelines && (
                <ThemedView type="backgroundElement" style={styles.guidelines}>
                  <GuidelinesList />
                  <PrimaryButton
                    label="I agree"
                    onPress={() => {
                      setAgreed(true);
                      setShowGuidelines(false);
                    }}
                  />
                </ThemedView>
              )}
            </>
          )}

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <PrimaryButton
            label={submitLabel}
            onPress={save}
            busy={busy}
            dimmed={displayName.trim().length < 2}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function Checkbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.agreeTap}>
      <ThemedView
        type={checked ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked && <ThemedText type="smallBold">✓</ThemedText>}
      </ThemedView>
      <ThemedText type="small" style={styles.agreeText}>
        {label}
      </ThemedText>
    </Pressable>
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
  bioWarning: {
    color: '#e5484d',
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  socialInput: {
    flex: 1,
  },
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
  photo: {
    alignItems: 'center',
    gap: Spacing.two,
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
  error: {
    color: '#e5484d',
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dateInput: {
    flex: 1,
    textAlign: 'center',
  },
  yearInput: {
    flex: 1.5,
    textAlign: 'center',
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  agreeTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    borderColor: '#3c87f7',
  },
  agreeText: {
    flexShrink: 1,
  },
  guidelines: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.four,
  },
});
