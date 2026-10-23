import { supabase } from '@/lib/supabase';

export type Message = {
  id: string;
  activity_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

// Records that the user has seen everything in this chat up to now.
export async function markChatRead(activityId: string) {
  await supabase
    .from('chat_reads')
    .upsert({ activity_id: activityId, last_read_at: new Date().toISOString() });
}

// Unread message counts by activity id, for chats the user is part of.
export async function fetchUnreadCounts() {
  const { data } = await supabase.rpc('my_unread_counts');
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { activity_id: string; unread: number }[]) {
    counts.set(row.activity_id, Number(row.unread));
  }
  return counts;
}
