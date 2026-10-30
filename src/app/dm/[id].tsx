import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { PersonHeaderTitle } from '@/components/person-header-title';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatTime } from '@/lib/activities';
import { canMessage, fetchConversation, markDmsRead, type DirectMessage } from '@/lib/dms';
import { displayName, PROFILE_SUMMARY, type ProfileSummary } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

// Oldest first, so the newest message is at the bottom.
function addMessage(messages: DirectMessage[], message: DirectMessage) {
  if (messages.some((m) => m.id === message.id)) return messages;
  return [...messages, message];
}

// A one-on-one conversation with a crew member.
export default function DirectMessageScreen() {
  const { id: otherId } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const theme = useTheme();
  const myId = session?.user.id;

  const [other, setOther] = useState<ProfileSummary | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [allowed, setAllowed] = useState(true);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<DirectMessage>>(null);

  useEffect(() => {
    if (!myId) return;

    supabase
      .from('profiles')
      .select(PROFILE_SUMMARY)
      .eq('id', otherId)
      .maybeSingle()
      .then(({ data }) => setOther(data as ProfileSummary | null));
    fetchConversation(myId, otherId).then(
      // Fetched newest first (to get the latest 200), shown oldest first.
      (data) => setMessages(data.reverse()),
      (e: Error) => setError(e.message)
    );
    canMessage(myId, otherId).then(setAllowed);

    // Live updates. The database only sends messages you're allowed to read,
    // so just keep the ones from this conversation.
    const channel = supabase
      .channel(`dm:${myId}:${otherId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const message = payload.new as DirectMessage;
          const inThisChat =
            (message.sender_id === otherId && message.recipient_id === myId) ||
            (message.sender_id === myId && message.recipient_id === otherId);
          if (inThisChat) setMessages((current) => addMessage(current, message));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId, otherId]);

  // While the conversation is open, everything in it counts as read.
  const latestId = messages[messages.length - 1]?.id;
  useEffect(() => {
    markDmsRead(otherId);
  }, [otherId, latestId]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setDraft('');

    const { data, error } = await supabase
      .from('direct_messages')
      .insert({ recipient_id: otherId, body })
      .select()
      .single();
    if (error) {
      setError(error.message);
      setDraft(body);
    } else {
      setError(null);
      setMessages((current) => addMessage(current, data as DirectMessage));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: other ? displayName(other) : 'Message',
          headerTitle: () => (
            <PersonHeaderTitle person={other} onPress={() => router.push(`/user/${otherId}`)} />
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
          style={styles.flex}>
          <FlatList
            ref={listRef}
            data={messages}
            // Keep the newest message in view as messages load and arrive.
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const mine = item.sender_id === myId;
              const sent = new Date(item.created_at);
              return (
                <View style={[styles.messageRow, mine && styles.mineRow]}>
                  <ThemedView
                    type={mine ? 'backgroundSelected' : 'backgroundElement'}
                    style={[styles.bubble, mine && styles.mineBubble]}>
                    <ThemedText type="small" style={mine && styles.mineText}>
                      {item.body}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={[styles.time, mine && styles.mineTime]}>
                      {formatDay(sent) === 'Today'
                        ? formatTime(sent)
                        : `${formatDay(sent)} · ${formatTime(sent)}`}
                      {mine && item.read_at ? ' · Seen' : ''}
                    </ThemedText>
                  </ThemedView>
                </View>
              );
            }}
            ListEmptyComponent={
              <Pressable onPress={() => router.push(`/user/${otherId}`)} style={styles.empty}>
                <Avatar profile={other} size={72} />
                <ThemedText type="smallBold">{displayName(other)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                  You&apos;re in each other&apos;s crew. Say hi, or plan the next hangout.
                </ThemedText>
              </Pressable>
            }
          />

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          {allowed ? (
            <View style={styles.composer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                  },
                ]}
                placeholder="Message"
                placeholderTextColor={theme.textSecondary}
                maxLength={1000}
                multiline
                value={draft}
                onChangeText={setDraft}
              />
              <Pressable
                onPress={send}
                disabled={!draft.trim()}
                style={({ pressed }) => [
                  pressed && styles.pressed,
                  !draft.trim() && styles.dimmed,
                ]}>
                <View style={styles.sendButton}>
                  <ThemedText type="smallBold" style={styles.sendLabel}>
                    Send
                  </ThemedText>
                </View>
              </Pressable>
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.notice}>
              You can only message people in your crew.
            </ThemedText>
          )}
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
    maxWidth: MaxContentWidth,
  },
  flex: {
    flex: 1,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
    flexGrow: 1,
  },
  messageRow: {
    maxWidth: '85%',
  },
  mineRow: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  mineBubble: {
    backgroundColor: Brand.blue,
    backgroundImage: Brand.gradient,
  },
  mineText: {
    color: '#ffffff',
  },
  mineTime: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  time: {
    fontSize: 11,
    lineHeight: 14,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
  },
  center: {
    textAlign: 'center',
  },
  error: {
    color: '#e5484d',
    paddingHorizontal: Spacing.three,
  },
  notice: {
    textAlign: 'center',
    padding: Spacing.three,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: Brand.blue,
    backgroundImage: Brand.gradient,
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  sendLabel: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
  dimmed: {
    opacity: 0.5,
  },
});
