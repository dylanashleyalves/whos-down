import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signInWithGoogle } from '@/lib/google-auth';
import { supabase } from '@/lib/supabase';

type Mode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function continueWithGoogle() {
    setGoogleBusy(true);
    setMessage(null);
    try {
      // On success the auth listener updates the session and the router moves on.
      await signInWithGoogle();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not sign in with Google.');
    }
    setGoogleBusy(false);
  }

  async function submit() {
    setBusy(true);
    setMessage(null);

    const credentials = { email: email.trim(), password };
    const { data, error } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

    if (error) {
      setMessage(error.message);
    } else if (mode === 'sign-up' && !data.session) {
      // Supabase sends a confirmation email when "Confirm email" is on.
      setMessage('Check your email to confirm your account, then sign in.');
      setMode('sign-in');
    }
    // On success the auth listener updates the session and the router moves to the app.
    setBusy(false);
  }

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}>
          <ThemedText type="title">Who&apos;s down?</ThemedText>
          <ThemedText themeColor="textSecondary">
            Find people nearby to play, lift, game and hang out with.
          </ThemedText>

          <Pressable
            disabled={busy}
            onPress={continueWithGoogle}
            accessibilityLabel="Continue with Google"
            style={({ pressed }) => [styles.google, pressed && styles.pressed]}>
            {googleBusy ? (
              <ActivityIndicator color="#1F1F1F" />
            ) : (
              <>
                <Image
                  source={require('@/assets/images/google-g.svg')}
                  style={styles.googleG}
                  contentFit="contain"
                  accessibilityIgnoresInvertColors
                />
                <ThemedText type="smallBold" style={styles.googleLabel}>
                  Continue with Google
                </ThemedText>
              </>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} />
            <ThemedText type="small" themeColor="textSecondary">
              or use email
            </ThemedText>
            <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} />
          </View>

          <TextInput
            style={inputStyle}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <View>
            <TextInput
              style={[inputStyle, styles.passwordInput]}
              placeholder={mode === 'sign-up' ? 'Password (6+ characters)' : 'Password'}
              placeholderTextColor={theme.textSecondary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.showPassword}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
              <ThemedText type="small" themeColor="textSecondary">
                {showPassword ? 'Hide' : 'Show'}
              </ThemedText>
            </Pressable>
          </View>

          {message && (
            <ThemedText type="small" themeColor="textSecondary">
              {message}
            </ThemedText>
          )}

          <Pressable
            disabled={busy || !email || password.length < 6}
            onPress={submit}
            style={({ pressed }) => [
              pressed && styles.pressed,
              (busy || !email || password.length < 6) && styles.disabled,
            ]}>
            <ThemedView type="backgroundSelected" style={styles.button}>
              {busy ? (
                <ActivityIndicator color={theme.text} />
              ) : (
                <ThemedText type="smallBold">
                  {mode === 'sign-in' ? 'Sign in' : 'Create account'}
                </ThemedText>
              )}
            </ThemedView>
          </Pressable>

          <Pressable
            onPress={() => {
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
              setMessage(null);
            }}>
            <ThemedText type="link" style={styles.switchMode}>
              {mode === 'sign-in'
                ? 'New here? Create an account'
                : 'Already have an account? Sign in'}
            </ThemedText>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
  },
  // Google's sign-in button style: white, with dark text.
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
    minHeight: 52,
  },
  googleG: {
    width: 20,
    height: 20,
  },
  googleLabel: {
    color: '#1F1F1F',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  line: {
    flex: 1,
    height: 1,
  },
  passwordInput: {
    // Room for the Show/Hide button.
    paddingRight: 64,
  },
  showPassword: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  input: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  switchMode: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
