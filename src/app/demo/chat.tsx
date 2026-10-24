import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/activities';
import { DEMO_ACTIVITIES, DEMO_ME, DEMO_MESSAGES, DEMO_PEOPLE } from '@/lib/demo-data';
import { displayName } from '@/lib/profiles';

// Dev-only copy of the group chat for the basketball game, for screenshots.
export default function DemoChatScreen() {
  const theme = useTheme();
  const activity = DEMO_ACTIVITIES.find((a) => a.id === 'basketball')!;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.topic}>
          {activity.title}
        </ThemedText>

        <FlatList
          inverted
          data={DEMO_MESSAGES}
          initialNumToRender={DEMO_MESSAGES.length}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const mine = item.user_id === DEMO_ME.id;
            const sender = DEMO_PEOPLE.get(item.user_id);
            return (
              <View style={[styles.messageRow, mine && styles.mineRow]}>
                {!mine && <Avatar profile={sender} size={28} />}
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
        />

        <View style={styles.composer}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            placeholder="Message"
            placeholderTextColor={theme.textSecondary}
            editable={false}
          />
          <View style={styles.sendButton}>
            <ThemedText type="smallBold" style={styles.sendLabel}>
              Send
            </ThemedText>
          </View>
        </View>
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
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  input: {
    flex: 1,
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
});
