import { isRunningInExpoGo } from 'expo';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Where Google (through Supabase) sends people back to: whosdown://auth-callback in the
// real app, exp://…/--/auth-callback in Expo Go. Both must be in Supabase's Redirect URLs.
export const AUTH_CALLBACK = Linking.createURL('auth-callback');

// Supabase puts the session in the URL after "#" (or an error after "?").
function paramsFrom(url: string) {
  const params = new URLSearchParams(url.split('?')[1]?.split('#')[0] ?? '');
  new URLSearchParams(url.split('#')[1] ?? '').forEach((value, key) => params.set(key, value));
  return params;
}

// Signs in with the tokens in a return link. Returns true if it did.
export async function createSessionFromUrl(url: string) {
  const params = paramsFrom(url);
  const problem = params.get('error_description') ?? params.get('error');
  if (problem) throw new Error(problem.replace(/\+/g, ' '));

  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return false;

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return true;
}

// The "Web application" OAuth client in Google Cloud (not a secret). Supabase checks that
// Google sign-in tokens were issued for it.
const WEB_CLIENT_ID = '761772924877-dgvgolsao1ptant1p05sb909f9c4ghn0.apps.googleusercontent.com';

type NativeGoogle = typeof import('@react-native-google-signin/google-signin');
let native: Promise<NativeGoogle | null> | null = null;

// Android's built-in Google account picker. Only in app builds that include it: not on
// web, not in Expo Go, and not in builds from before it was added (then this is null).
function nativeGoogle() {
  if (Platform.OS === 'web' || isRunningInExpoGo()) return Promise.resolve(null);
  native ??= import('@react-native-google-signin/google-signin')
    .then((module) => {
      module.GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
      return module;
    })
    .catch(() => null);
  return native;
}

// Signs in with Google. Returns false if the person cancelled. New accounts then go
// through the usual profile setup.
export async function signInWithGoogle() {
  const google = await nativeGoogle();
  if (google) {
    try {
      return await signInNatively(google);
    } catch (e) {
      // Usually DEVELOPER_ERROR: this build's signing key isn't registered in Google Cloud.
      // Fall back to the browser so people can still sign in.
      console.warn('Native Google sign-in failed, using the browser instead', e);
    }
  }
  return signInWithBrowser();
}

async function signInNatively({
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
}: NativeGoogle) {
  await GoogleSignin.hasPlayServices();
  // Forget the last account, so Google always asks which one to use.
  await GoogleSignin.signOut().catch(() => null);
  let response;
  try {
    response = await GoogleSignin.signIn();
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return false;
    throw e;
  }
  if (!isSuccessResponse(response)) return false;
  if (!response.data.idToken) throw new Error('Google did not return a sign-in token');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: response.data.idToken,
  });
  if (error) throw error;
  return true;
}

// Opens Google's sign-in page in the browser and signs in when it comes back. Used on
// web, in Expo Go, and in older builds.
async function signInWithBrowser() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: Platform.OS === 'web' ? `${window.location.origin}/auth-callback` : AUTH_CALLBACK,
      // Let Google ask which account to use, rather than silently picking the last one.
      queryParams: { prompt: 'select_account' },
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });
  if (error) throw error;
  // On web the page itself goes to Google and comes back to /auth-callback.
  if (Platform.OS === 'web') return true;

  const result = await WebBrowser.openAuthSessionAsync(data.url ?? '', AUTH_CALLBACK);
  if (result.type !== 'success') return false;
  return createSessionFromUrl(result.url);
}
