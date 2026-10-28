import Constants, { ExecutionEnvironment } from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Push needs a real build on a real phone: Expo Go on Android and emulators can't get tokens.
export function canUsePush() {
  return (
    Platform.OS !== 'web' &&
    Device.isDevice &&
    !isRunningInExpoGo() &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient
  );
}

let loaded: Promise<typeof NotificationsModule | null> | null = null;

// expo-notifications is only loaded in real builds: just importing it crashes Expo Go
// on Android, which doesn't include its native modules. If loading fails anyway, the
// app carries on without push notifications instead of crashing.
async function notifications() {
  if (!canUsePush()) return null;
  loaded ??= import('expo-notifications')
    .then((module) => {
      // The app already shows its own banner for new messages while it's open, so don't
      // also show the system one then.
      module.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: false,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      return module;
    })
    .catch((error) => {
      console.warn('Push notifications are unavailable here', error);
      return null;
    });
  return loaded;
}

let currentToken: string | null = null;

// Asks permission if needed, then saves this phone's push token for the signed-in user.
// Returns false if push isn't available or the person said no.
export async function registerForPush() {
  const Notifications = await notifications();
  if (!Notifications) return false;

  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission prompt once a channel exists.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Messages and reminders',
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

// Calls onOpen with the screen to show when a notification is tapped, including the one
// that opened the app. Returns a function that stops listening.
export function onNotificationTap(onOpen: (href: string) => void) {
  let stopped = false;
  let subscription: { remove: () => void } | null = null;

  notifications().then(async (Notifications) => {
    if (!Notifications) return;
    const open = (response: NotificationsModule.NotificationResponse | null) => {
      if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const href = response.notification.request.content.data?.href;
      if (typeof href === 'string' && href.startsWith('/')) onOpen(href);
    };

    const last = await Notifications.getLastNotificationResponseAsync();
    if (stopped) return;
    open(last);
    // Don't open the same notification again next time the app starts.
    await Notifications.clearLastNotificationResponseAsync();
    subscription = Notifications.addNotificationResponseReceivedListener(open);
  });

  return () => {
    stopped = true;
    subscription?.remove();
  };
}
