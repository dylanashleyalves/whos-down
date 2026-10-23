import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchActivity, formatTime, type ActivityWithPeople } from '@/lib/activities';
import { displayName, type ProfileSummary } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type Message = {
  id: string;
  activity_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

// Newest first, because the list is inverted (newest at the bottom).
function addMessage(messages: Message[], message: Message) {
  if (messages.some((m) => m.id === message.id)) return messages;
  return [message, ...messages];
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const theme = useTheme();
  const myId = session?.user.id;

  const [activity, setActivity] = useState<ActivityWithPeople | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivity(id).then(setActivity, (e: Error) => setError(e.message));

    supabase
      .from('messages')
      .select('*')
      .eq('activity_id', id)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setMessages(data as Message[]);
      });

    // Live updates: new messages from everyone in the chat.
    const channel = supabase
      .channel(`chat:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `activity_id=eq.${id}` },
        (payload) => setMessages((current) => addMessage(current, payload.new as Message))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Look up names and photos for message senders.
  const people = useMemo(() => {
    const map = new Map<string, ProfileSummary | null>();
    if (activity) {
      map.set(activity.host_id, activity.host);
      activity.members.forEach((m) => map.set(m.user_id, m.profile));
    }
    return map;
  }, [activity]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setDraft('');

    const { data, error } = await supabase
      .from('messages')
      .insert({ activity_id: id, body })
      .select()
      .single();
    if (error) {
      setError(error.message);
      setDraft(body);
    } else {
      setError(null);
      setMessages((current) => addMessage(current, data as Message));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
          style={styles.flex}>
          {activity && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.topic}>
              {activity.title}
            </ThemedText>
          )}

          <FlatList
            inverted
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const mine = item.user_id === myId;
              const sender = people.get(item.user_id);
              return (
                <View style={[styles.messageRow, mine && styles.mineRow]}>
                  {!mine && (
                    <Pressable onPress={() => router.push(`/user/${item.user_id}`)}>
                      <Avatar profile={sender} size={28} />
                    </Pressable>
                  )}
                  <ThemedView
                    type={mine ? 'backgroundSelected' : 'backgroundElement'}
                    style={styles.bubble}>
                    {!mine && <ThemedText type="smallBold">{displayName(sender)}</ThemedText>}
                    <ThemedText type="small">{item.body}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.time}>
                      {formatTime(new Date(item.created_at))}
                    </ThemedText>
                  </ThemedView>
                </View>
              );
            }}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                No messages yet. Say hi and sort out the details.
              </ThemedText>
            }
          />

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <View style={styles.composer}>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
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
              style={({ pressed }) => [pressed && styles.pressed, !draft.trim() && styles.dimmed]}>
              <View style={styles.sendButton}>
                <ThemedText type="smallBold" style={styles.sendLabel}>
                  Send
                </ThemedText>
              </View>
            </Pressable>
          </View>
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
  topic: {
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    maxWidth: '85%',
  },
  mineRow: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    flexShrink: 1,
  },
  time: {
    fontSize: 11,
    lineHeight: 14,
  },
  empty: {
    textAlign: 'center',
    // The list is inverted, so flip the empty message back upright.
    transform: [{ scaleY: -1 }],
  },
  error: {
    color: '#e5484d',
    paddingHorizontal: Spacing.three,
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
    backgroundColor: '#3c87f7',
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
