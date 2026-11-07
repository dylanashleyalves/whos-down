import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { DmConversation } from '@/components/dm-conversation';
import { canMessage, fetchConversation, markDmsRead, type DirectMessage } from '@/lib/dms';
import { PROFILE_SUMMARY, type ProfileSummary } from '@/lib/profiles';
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
  const myId = session?.user.id;

  const [other, setOther] = useState<ProfileSummary | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [allowed, setAllowed] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function send(body: string) {
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({ recipient_id: otherId, body })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return false;
    }
    setError(null);
    setMessages((current) => addMessage(current, data as DirectMessage));
    return true;
  }

  return (
    <DmConversation
      other={other}
      messages={messages}
      myId={myId}
      allowed={allowed}
      error={error}
      onSend={send}
      // Opened from a notification, there may be nothing to go back to.
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/messages'))}
      onOpenProfile={() => router.push(`/user/${otherId}`)}
    />
  );
}
