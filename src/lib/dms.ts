import { supabase } from '@/lib/supabase';

// One-on-one messages between crew members. The database only lets you message
// people who picked you back on "Hang again?" (see 0009_direct_messages.sql).

export type DirectMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type DmThread = {
  other_id: string;
  display_name: string | null;
  avatar_url: string | null;
  last_body: string | null;
  last_at: string | null;
  last_from_me: boolean;
  unread: number;
  can_message: boolean;
};

export async function fetchDmThreads() {
  const { data, error } = await supabase.rpc('my_dm_threads');
  if (error) throw error;
  return data as DmThread[];
}

// Messages between me and one other person, newest first (for an inverted list).
export async function fetchConversation(myId: string, otherId: string) {
  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .or(
      `and(sender_id.eq.${myId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${myId})`
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as DirectMessage[];
}

export async function markDmsRead(otherId: string) {
  await supabase.rpc('mark_dms_read', { other_user: otherId });
}

export async function canMessage(myId: string, otherId: string) {
  const { data } = await supabase.rpc('is_crew', { a: myId, b: otherId });
  return data === true;
}
