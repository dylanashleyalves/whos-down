import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import * as Updates from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Chip } from '@/components/chip';
import { FeedbackBox } from '@/components/feedback-box';
import { showIntro } from '@/components/intro-cards';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDay } from '@/lib/activities';
import { loadThemePreference, setThemePreference, type ThemePreference } from '@/lib/appearance';
import { confirmAction } from '@/lib/confirm';
import { registerForPush, unregisterForPush } from '@/lib/notifications';
import {
  displayName,
  maskEmail,
  PROFILE_SUMMARY,
  type PrivateProfile,
  type ProfileSummary,
} from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/lib/toast';
import { useAuth } from '@/providers/auth-provider';

// The app's website, with the privacy policy and terms (docs/ on GitHub Pages).
const SITE = 'https://dylanashleyalves.github.io/whos-down';

type NotifySwitch =
  | 'notify_messages'
  | 'notify_joins'
  | 'notify_activities'
  | 'notify_kudos'
  | 'notify_reminders'
  | 'notify_nudges';

const NOTIFICATION_TYPES: { key: NotifySwitch; label: string; detail: string }[] = [
  { key: 'notify_messages', label: '💬 Messages', detail: 'Group chats and direct messages' },
  { key: 'notify_joins', label: '🙋 People joining', detail: 'When someone joins your activity' },
  {
    key: 'notify_activities',
    label: '✨ New activities',
    detail: 'Posts near you that match your interests, up to 3 a day',
  },
  { key: 'notify_kudos', label: '👏 Kudos', detail: 'When someone gives you kudos after a meetup' },
  {
    key: 'notify_reminders',
    label: '⏰ Reminders',
    detail: 'An hour before you meet, and when to check people in',
  },
  {
    key: 'notify_nudges',
    label: '👋 Nudges',
    detail: "A friendly reminder if you haven't been on for a week",
  },
];

const THEMES: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: '📱 Match phone' },
  { key: 'light', label: '☀️ Light' },
  { key: 'dark', label: '🌙 Dark' },
];

export default function SettingsScreen() {
  const { session, profile, privateProfile, refreshProfile } = useAuth();
  const userId = session?.user.id;
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [blocked, setBlocked] = useState<ProfileSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadThemePreference().then(setTheme);
  }, []);

  const loadBlocked = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('blocks')
      .select(`blocked:profiles!blocks_blocked_id_fkey(${PROFILE_SUMMARY})`)
      .eq('blocker_id', userId);
    const rows = (data ?? []) as unknown as { blocked: ProfileSummary | null }[];
    setBlocked(rows.flatMap((row) => (row.blocked ? [row.blocked] : [])));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadBlocked();
    }, [loadBlocked])
  );

  const masterOn = privateProfile?.notifications_enabled !== false;

  async function updatePrivate(fields: Partial<PrivateProfile>) {
    setError(null);
    const { error } = await supabase
      .from('profile_private')
      .update(fields)
      .eq('id', userId ?? '');
    if (error) setError(error.message);
    await refreshProfile();
    return !error;
  }

  async function setMaster(on: boolean) {
    if ((await updatePrivate({ notifications_enabled: on })) && on) registerForPush();
  }

  async function unblock(id: string) {
    await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', userId ?? '')
      .eq('blocked_id', id);
    showToast('Unblocked');
    loadBlocked();
  }

  async function signOut() {
    // Stop this phone getting the next person's notifications.
    await unregisterForPush();
    await supabase.auth.signOut();
  }

  async function deleteAccount() {
    const ok = await confirmAction(
      'Delete your account?',
      'Your profile, photos, activities, messages and crew will be deleted for good. This can’t be undone.',
      'Delete my account'
    );
    if (!ok || !userId) return;

    setDeleting(true);
    setError(null);
    await unregisterForPush();
    // Photos live in storage, which doesn't clear itself when the account goes.
    const { data: photos } = await supabase.storage.from('avatars').list(userId);
    if (photos && photos.length > 0) {
      await supabase.storage.from('avatars').remove(photos.map((p) => `${userId}/${p.name}`));
    }
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      setDeleting(false);
      setError(`Couldn't delete your account: ${error.message}`);
      return;
    }
    // The account is gone, so only clear this phone's session.
    await supabase.auth.signOut({ scope: 'local' });
  }

  const version = Constants.expoConfig?.version ?? '?';
  const updateNote = Updates.updateId
    ? `Update ${Updates.updateId.slice(0, 8)}${Updates.createdAt ? ` · ${formatDay(Updates.createdAt)}` : ''}`
    : 'Built-in version';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <Section title="Account">
          <Row onPress={() => router.push('/edit-profile')}>
            <Avatar profile={profile} size={44} />
            <View style={styles.grow}>
              <ThemedText type="smallBold">{displayName(profile)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {maskEmail(session?.user.email)}
              </ThemedText>
            </View>
            <Chevron label="Edit" />
          </Row>
          <ChangePassword />
          <Row onPress={signOut}>
            <ThemedText type="small" style={styles.grow}>
              🚪 Sign out
            </ThemedText>
          </Row>
        </Section>

        <Section title="Notifications">
          <SwitchRow
            label="Allow notifications"
            detail="Turn everything off with one switch"
            value={masterOn}
            onChange={setMaster}
          />
          {NOTIFICATION_TYPES.map((type) => (
            <SwitchRow
              key={type.key}
              label={type.label}
              detail={type.detail}
              disabled={!masterOn}
              value={masterOn && privateProfile?.[type.key] !== false}
              onChange={(on) => updatePrivate({ [type.key]: on })}
            />
          ))}
        </Section>

        <Section title="Appearance">
          <View style={styles.padded}>
            <ThemedText type="small" themeColor="textSecondary">
              Theme
            </ThemedText>
            <View style={styles.chips}>
              {THEMES.map((option) => (
                <Chip
                  key={option.key}
                  label={option.label}
                  color={Brand.purple}
                  selected={theme === option.key}
                  onPress={() => {
                    setTheme(option.key);
                    setThemePreference(option.key);
                  }}
                />
              ))}
            </View>
          </View>
        </Section>

        <Section title="Privacy & safety">
          <Row onPress={() => router.push('/guidelines')}>
            <ThemedText type="small" style={styles.grow}>
              📜 Community guidelines
            </ThemedText>
            <Chevron />
          </Row>
          <View style={styles.padded}>
            <ThemedText type="small" themeColor="textSecondary">
              {blocked.length === 0
                ? '🚫 Blocked people: nobody. You can block someone from their profile.'
                : `🚫 Blocked people (${blocked.length})`}
            </ThemedText>
            {blocked.map((person) => (
              <View key={person.id} style={styles.blockedRow}>
                <Avatar profile={person} size={32} />
                <ThemedText type="small" style={styles.grow}>
                  {displayName(person)}
                </ThemedText>
                <Pressable onPress={() => unblock(person.id)} hitSlop={8}>
                  <ThemedText type="linkPrimary">Unblock</ThemedText>
                </Pressable>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Help">
          <Row onPress={showIntro}>
            <ThemedText type="small" style={styles.grow}>
              🧭 How Who&apos;s Down works
            </ThemedText>
            <Chevron />
          </Row>
          <View style={styles.padded}>
            <FeedbackBox />
          </View>
        </Section>

        <Section title="About">
          <Row onPress={() => WebBrowser.openBrowserAsync(`${SITE}/privacy.html`)}>
            <ThemedText type="small" style={styles.grow}>
              🔒 Privacy policy
            </ThemedText>
            <Chevron />
          </Row>
          <Row onPress={() => WebBrowser.openBrowserAsync(`${SITE}/terms.html`)}>
            <ThemedText type="small" style={styles.grow}>
              📄 Terms of service
            </ThemedText>
            <Chevron />
          </Row>
          <View style={styles.padded}>
            <ThemedText type="small">Who&apos;s Down {version}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {updateNote}
            </ThemedText>
          </View>
        </Section>

        <Section title="Danger zone">
          <View style={styles.padded}>
            <ThemedText type="small" themeColor="textSecondary">
              Permanently delete your account and everything in it.
            </ThemedText>
            <PrimaryButton
              label="Delete my account"
              variant="secondary"
              busy={deleting}
              onPress={deleteAccount}
            />
          </View>
        </Section>
      </ScrollView>
    </ThemedView>
  );
}

function ChangePassword() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (password.length < 6) return setError('Use at least 6 characters.');
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    setOpen(false);
    setPassword('');
    setConfirm('');
    showToast('Password changed ✓');
  }

  if (!open) {
    return (
      <Row onPress={() => setOpen(true)}>
        <ThemedText type="small" style={styles.grow}>
          🔑 Change password
        </ThemedText>
        <Chevron />
      </Row>
    );
  }

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.background }];
  return (
    <View style={styles.padded}>
      <ThemedText type="smallBold">Change password</ThemedText>
      <TextInput
        style={inputStyle}
        placeholder="New password"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry={!show}
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={inputStyle}
        placeholder="Type it again"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry={!show}
        autoCapitalize="none"
        value={confirm}
        onChangeText={setConfirm}
      />
      <Pressable onPress={() => setShow(!show)} hitSlop={8}>
        <ThemedText type="linkPrimary">{show ? 'Hide passwords' : 'Show passwords'}</ThemedText>
      </Pressable>
      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}
      <PrimaryButton label="Save password" busy={busy} onPress={save} />
      <PrimaryButton label="Cancel" variant="secondary" onPress={() => setOpen(false)} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.card}>
        {children}
      </ThemedView>
    </View>
  );
}

function Row({ onPress, children }: { onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

function Chevron({ label }: { label?: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {label ? `${label} ›` : '›'}
    </ThemedText>
  );
}

function SwitchRow({
  label,
  detail,
  value,
  disabled,
  onChange,
}: {
  label: string;
  detail: string;
  value: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <View style={[styles.row, disabled && styles.dimmed]}>
      <View style={styles.grow}>
        <ThemedText type="small">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: Brand.purple }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 1,
    paddingHorizontal: Spacing.two,
  },
  card: {
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    minHeight: 52,
  },
  padded: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  input: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
  },
  grow: {
    flex: 1,
  },
  error: {
    color: '#e5484d',
  },
  pressed: {
    opacity: 0.6,
  },
  dimmed: {
    opacity: 0.45,
  },
});
