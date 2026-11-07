import { useRef, useState } from 'react';
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
import type { DirectMessage } from '@/lib/dms';
import { displayName, type ProfileSummary } from '@/lib/profiles';

type DmConversationProps = {
  other: Pick<ProfileSummary, 'display_name' | 'avatar_url'> | null;
  messages: DirectMessage[];
  myId?: string;
  allowed: boolean;
  error: string | null;
  // Resolves to false if it couldn't send, so the draft comes back.
  onSend: (body: string) => Promise<boolean>;
  onBack: () => void;
  onOpenProfile: () => void;
};

// The conversation itself. The screen loads the data and sends the messages.
export function DmConversation({
  other,
  messages,
  myId,
  allowed,
  error,
  onSend,
  onBack,
  onOpenProfile,
}: DmConversationProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<DirectMessage>>(null);
  const canSend = draft.trim().length > 0;
  // "Seen" only shows on the latest message they've read.
  const lastSeenId = messages.filter((m) => m.sender_id === myId && m.read_at).at(-1)?.id;

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    if (!(await onSend(body))) setDraft(body);
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.column}>
        <SafeAreaView style={styles.flex}>
          <View style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}>
            <Pressable
              onPress={onBack}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <ThemedText style={styles.backIcon}>←</ThemedText>
            </Pressable>
            <PersonHeaderTitle person={other} onPress={onOpenProfile} />
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            style={styles.flex}
            // Keep the newest message in view as messages load and arrive.
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => {
              const mine = item.sender_id === myId;
              const sent = new Date(item.created_at);
              const previous = messages[index - 1];
              const newDay =
                !previous || new Date(previous.created_at).toDateString() !== sent.toDateString();
              const sameSender = !newDay && previous?.sender_id === item.sender_id;
              return (
                <>
                  {newDay && (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.day}>
                      {formatDay(sent)}
                    </ThemedText>
                  )}
                  <View
                    style={[
                      styles.messageRow,
                      mine && styles.mineRow,
                      !newDay && (sameSender ? styles.closeGap : styles.senderGap),
                    ]}>
                    <ThemedView
                      type="backgroundElement"
                      style={[styles.bubble, mine && styles.mineBubble]}>
                      <ThemedText type="small" style={mine && styles.mineText}>
                        {item.body}
                      </ThemedText>
                      <ThemedText
                        type="small"
                        themeColor="textSecondary"
                        style={[styles.time, mine && styles.mineTime]}>
                        {formatTime(sent)}
                        {item.id === lastSeenId ? ' · Seen' : ''}
                      </ThemedText>
                    </ThemedView>
                  </View>
                </>
              );
            }}
            ListEmptyComponent={
              <Pressable onPress={onOpenProfile} style={styles.empty}>
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
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel="Send"
                style={({ pressed }) => [pressed && styles.pressed, !canSend && styles.dimmed]}>
                <View style={styles.sendButton}>
                  <ThemedText style={styles.sendIcon}>↑</ThemedText>
                </View>
              </Pressable>
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.notice}>
              You can only message people in your crew.
            </ThemedText>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const SEND_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  column: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    lineHeight: 30,
  },
  // Messages sit just above the box you type in, not at the top of the screen.
  list: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  day: {
    textAlign: 'center',
    marginVertical: Spacing.two,
  },
  messageRow: {
    maxWidth: '78%',
    alignSelf: 'flex-start',
  },
  mineRow: {
    alignSelf: 'flex-end',
  },
  closeGap: {
    marginTop: 2,
  },
  senderGap: {
    marginTop: Spacing.two,
  },
  bubble: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.two + Spacing.one,
    borderRadius: 18,
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
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    paddingTop: Spacing.one,
  },
  input: {
    flex: 1,
    minHeight: SEND_SIZE,
    maxHeight: 120,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: SEND_SIZE / 2,
    fontSize: 16,
  },
  sendButton: {
    width: SEND_SIZE,
    height: SEND_SIZE,
    borderRadius: SEND_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.blue,
    backgroundImage: Brand.gradient,
  },
  sendIcon: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.7,
  },
  dimmed: {
    opacity: 0.5,
  },
});
