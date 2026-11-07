import { useState } from 'react';

import { DmConversation } from '@/components/dm-conversation';
import type { DirectMessage } from '@/lib/dms';

const ME = 'me';
const THEM = 'them';

function message(id: string, sender: string, body: string, created: string, seen = false) {
  return {
    id,
    sender_id: sender,
    recipient_id: sender === ME ? THEM : ME,
    body,
    created_at: created,
    read_at: seen ? created : null,
  } as DirectMessage;
}

// Dev-only copy of a conversation with sample data, for screenshots.
export default function DemoDmScreen() {
  const [messages, setMessages] = useState([
    message('1', ME, 'Hi', '2026-10-26T14:51:00Z', true),
    message('2', THEM, 'Hey! Good game on Saturday', '2026-10-26T14:59:00Z'),
    message('3', ME, 'Ayo', '2026-10-28T07:43:00Z', true),
    message('4', ME, 'Same time next week?', '2026-10-28T07:44:00Z', true),
    message('5', THEM, 'Down. I can bring a ball', '2026-10-29T10:32:00Z'),
    message('6', ME, 'Perfect', '2026-10-29T10:40:00Z'),
  ]);

  return (
    <DmConversation
      other={{ display_name: 'Dylan', avatar_url: null }}
      messages={messages}
      myId={ME}
      allowed
      error={null}
      onSend={async (body) => {
        setMessages((current) => [
          ...current,
          message(String(current.length + 1), ME, body, '2026-10-30T10:00:00Z'),
        ]);
        return true;
      }}
      onBack={() => {}}
      onOpenProfile={() => {}}
    />
  );
}
