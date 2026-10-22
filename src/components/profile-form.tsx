import * as ImagePicker from 'expo-image-picker';
import { useState, type ReactNode } from 'react';
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
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Categories, type Category } from '@/lib/activities';
import { uploadAvatar } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type ProfileFormProps = {
  header?: ReactNode;
  submitLabel: string;
  onSaved: () => void;
};

export function ProfileForm({ header, submitLabel, onSaved }: ProfileFormProps) {
  const theme = useTheme();
  const { session, profile, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [interests, setInterests] = useState<Category[]>(profile?.interests ?? []);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;
  const preview = { display_name: displayName, avatar_url: photo?.uri ?? profile?.avatar_url ?? null };

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

  async function save() {
    if (!userId) return;
    if (displayName.trim().length < 2) {
      setError('Add your first name (2+ characters).');
      return;
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
        bio: bio.trim() || null,
        interests,
        avatar_url: avatarUrl,
      });
      if (error) throw error;

      await refreshProfile();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {header}

          <Pressable onPress={pickPhoto} style={styles.photo}>
            <Avatar profile={preview} size={96} />
            <ThemedText type="linkPrimary">{preview.avatar_url ? 'Change photo' : 'Add a photo'}</ThemedText>
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
              Write it the way locals would, plus your city or country so others know where that is.
            </ThemedText>
          </Field>

          <Field label="What are you into?">
            <View style={styles.wrap}>
              {(Object.keys(Categories) as Category[]).map((key) => (
                <Chip
                  key={key}
                  label={`${Categories[key].emoji} ${Categories[key].label}`}
                  selected={interests.includes(key)}
                  onPress={() => toggleInterest(key)}
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
          </Field>

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
});
