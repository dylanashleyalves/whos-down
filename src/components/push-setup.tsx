import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { registerForPush } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

// Runs once someone is signed in and set up: registers this phone for notifications,
// records that they opened the app, and opens the right screen when a notification is tapped.
export function PushSetup() {
  const { session, privateProfile } = useAuth();
  const userId = session?.user.id;
  const enabled = privateProfile?.notifications_enabled !== false;
  const lastResponse = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase.rpc('touch_last_seen');
    if (enabled) registerForPush();
  }, [userId, enabled]);

  // Tapping a notification (including the one that opened the app) goes to its screen.
  useEffect(() => {
    if (!lastResponse || lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return;
    }
    const id = lastResponse.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;

    const href = lastResponse.notification.request.content.data?.href;
    if (typeof href === 'string' && href.startsWith('/')) {
      router.push(href as Parameters<typeof router.push>[0]);
    }
  }, [lastResponse]);

  return null;
}
