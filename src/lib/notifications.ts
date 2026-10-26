import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// The app already shows its own banner for new messages while it's open, so don't
// also show the system one then.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Push needs a real build on a real phone: Expo Go on Android and emulators can't get tokens.
export function canUsePush() {
  return (
    Platform.OS !== 'web' &&
    Device.isDevice &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient
  );
}

let currentToken: string | null = null;

// Asks permission if needed, then saves this phone's push token for the signed-in user.
// Returns false if push isn't available or the person said no.
export async function registerForPush() {
  if (!canUsePush()) return false;

  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission prompt once a channel exists.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Messages and reminders',
      // eslint-disable-next-line import/namespace -- re-exported with `export *`, which the lint rule can't follow
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#3C87F7',
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return false;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    currentToken = token;
    await supabase.rpc('register_push_token', { device_token: token });
    return true;
  } catch (error) {
    // Usually a network problem; the app tries again next time it opens.
    console.warn('Could not get a push token', error);
    return false;
  }
}

// Stops this phone getting notifications for the account that's signing out.
export async function unregisterForPush() {
  if (!currentToken) return;
  await supabase.rpc('unregister_push_token', { device_token: currentToken });
  currentToken = null;
}
