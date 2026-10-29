import { supabase } from '@/lib/supabase';

// Positive tags people can give each other after a meetup. Must match the check in
// supabase/migrations/0014_kudos.sql.
export const KUDOS = {
  friendly: { emoji: '😊', label: 'Friendly', color: '#F59E0B' },
  on_time: { emoji: '⏰', label: 'On time', color: '#3B82F6' },
  great_vibes: { emoji: '✨', label: 'Great vibes', color: '#A855F7' },
  welcoming: { emoji: '🤗', label: 'Welcoming', color: '#EC4899' },
  funny: { emoji: '😂', label: 'Funny', color: '#F97316' },
  skilled: { emoji: '🏆', label: 'Skilled', color: '#22C55E' },
} as const;

export type Kudo = keyof typeof KUDOS;

// Kudos can be given from when an activity starts until 14 days after (as in the migration).
const KUDOS_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function canGiveKudos(startsAt: string) {
  const since = Date.now() - new Date(startsAt).getTime();
  return since >= 0 && since < KUDOS_WINDOW_MS;
}

export type KudoCount = { tag: Kudo; total: number };

// How many times each tag was given to someone, most first.
export async function fetchKudos(userId: string): Promise<KudoCount[]> {
  const { data, error } = await supabase.rpc('user_kudos', { target_user: userId });
  if (error) {
    console.warn('Could not load kudos', error);
    return [];
  }
  return ((data ?? []) as KudoCount[]).filter((row) => row.tag in KUDOS);
}

// The tags I gave each person at an activity.
export async function fetchMyKudos(activityId: string) {
  const { data } = await supabase
    .from('kudos')
    .select('to_user, tag')
    .eq('activity_id', activityId);
  const given = new Map<string, Set<Kudo>>();
  for (const row of data ?? []) {
    const tags = given.get(row.to_user as string) ?? new Set<Kudo>();
    tags.add(row.tag as Kudo);
    given.set(row.to_user as string, tags);
  }
  return given;
}

export function setKudo(activityId: string, toUser: string, tag: Kudo, on: boolean) {
  return on
    ? supabase.from('kudos').insert({ activity_id: activityId, to_user: toUser, tag })
    : supabase
        .from('kudos')
        .delete()
        .eq('activity_id', activityId)
        .eq('to_user', toUser)
        .eq('tag', tag);
}
