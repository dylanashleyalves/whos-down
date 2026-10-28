import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import type { Message } from '@/lib/chat';
import type { DirectMessage } from '@/lib/dms';
import { displayName } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const SHOW_FOR_MS = 5000;

type Alert = {
  // Where tapping the banner goes.
  href: `/chat/${string}` | `/dm/${string}`;
  heading: string;
  body: string;
};

// Pops up a banner at the top of the screen when a new group chat or direct message
// arrives while the app is open. The database only sends messages the user can read.
export function MessageAlerts() {
  const { session } = useAuth();
  const myId = session?.user.id;
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [alert, setAlert] = useState<Alert | null>(null);

  // The realtime callback below is set up once, so it reads the current screen from a ref.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!myId) return;

    const channel = supabase
      .channel('message-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const message = payload.new as Message;
          // Skip your own messages, and chats you're already looking at.
          if (message.user_id === myId) return;
          if (pathnameRef.current === `/chat/${message.activity_id}`) return;

          const [sender, activity] = await Promise.all([
            supabase
              .from('profiles')
              .select('display_name')
              .eq('id', message.user_id)
              .maybeSingle(),
            supabase.from('activities').select('title').eq('id', message.activity_id).maybeSingle(),
          ]);
          setAlert({
            href: `/chat/${message.activity_id}`,
            heading: `${displayName(sender.data)} · ${(activity.data?.title as string | undefined) ?? 'Group chat'}`,
            body: message.body,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${myId}`,
        },
        async (payload) => {
          const message = payload.new as DirectMessage;
          if (pathnameRef.current === `/dm/${message.sender_id}`) return;

          const sender = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', message.sender_id)
            .maybeSingle();
          setAlert({
            href: `/dm/${message.sender_id}`,
            heading: displayName(sender.data),
            body: message.body,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId]);

  // Hide the banner after a few seconds.
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setAlert(null), SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [alert]);

  if (!alert) return null;

  return (
    <View style={[styles.wrapper, { top: insets.top + Spacing.two }]} pointerEvents="box-none">
      <Pressable
        onPress={() => {
          setAlert(null);
          router.push(alert.href);
        }}
        style={({ pressed }) => [styles.banner, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={styles.text} numberOfLines={1}>
          💬 {alert.heading}
        </ThemedText>
        <ThemedText type="small" style={styles.text} numberOfLines={2}>
          {alert.body}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    alignItems: 'center',
    zIndex: 2000,
  },
  banner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: Brand.blue,
    backgroundImage: Brand.gradient,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  text: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.85,
  },
});
