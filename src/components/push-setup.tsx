import { router } from 'expo-router';
import { useEffect } from 'react';

import { onNotificationTap, registerForPush } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

// Runs once someone is signed in and set up: registers this phone for notifications,
// records that they opened the app, and opens the right screen when a notification is tapped.
export function PushSetup() {
  const { session, privateProfile } = useAuth();
  const userId = session?.user.id;
  const enabled = privateProfile?.notifications_enabled !== false;

  useEffect(() => {
    if (!userId) return;
    supabase.rpc('touch_last_seen');
    if (enabled) registerForPush();
  }, [userId, enabled]);

  useEffect(
    () => onNotificationTap((href) => router.push(href as Parameters<typeof router.push>[0])),
    []
  );

  return null;
}
