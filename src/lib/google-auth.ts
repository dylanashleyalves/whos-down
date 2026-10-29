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

// Opens Google's sign-in page and signs in when it comes back. Returns false if the
// person closed the page. New accounts then go through the usual profile setup.
export async function signInWithGoogle() {
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
