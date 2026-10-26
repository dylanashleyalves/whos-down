import { PROFILE_SUMMARY, type ProfileSummary } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

export const Categories = {
  sports: { label: 'Sports', emoji: '🏀' },
  gym: { label: 'Gym', emoji: '🏋️' },
  gaming: { label: 'Gaming', emoji: '🎮' },
  food: { label: 'Food', emoji: '🍜' },
  outdoors: { label: 'Outdoors', emoji: '🥾' },
  hangout: { label: 'Hangout', emoji: '🍻' },
} as const;

export type Category = keyof typeof Categories;

export type Activity = {
  id: string;
  host_id: string;
  title: string;
  category: Category;
  location: string;
  starts_at: string;
  spots: number;
  details: string | null;
  created_at: string;
  // When the host confirmed who showed up (null until then).
  checked_in_at: string | null;
};

export type Member = {
  user_id: string;
  joined_at: string;
  profile: ProfileSummary | null;
};

export type ActivityWithPeople = Activity & {
  host: ProfileSummary | null;
  members: Member[];
};

// The activity plus its host and everyone who joined. The host hint picks the
// direct host link, since profiles also connect to activities through members.
export const ACTIVITY_WITH_PEOPLE = `*,
  host:profiles!activities_host_id_fkey(${PROFILE_SUMMARY}),
  members:activity_members(user_id, joined_at, profile:profiles(${PROFILE_SUMMARY}))`;

export async function fetchActivity(id: string) {
  const { data, error } = await supabase
    .from('activities')
    .select(ACTIVITY_WITH_PEOPLE)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as ActivityWithPeople;
}

// Each person can post one new activity per day (also enforced in the database).
export const POST_LIMIT_MS = 24 * 60 * 60 * 1000;

// When this user can next post, or null if they can post now.
export async function fetchNextPostTime(userId: string) {
  const { data } = await supabase
    .from('activities')
    .select('created_at')
    .eq('host_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const next = new Date(new Date(data.created_at as string).getTime() + POST_LIMIT_MS);
  return next > new Date() ? next : null;
}

export function spotsLeft(activity: ActivityWithPeople) {
  return Math.max(activity.spots - activity.members.length, 0);
}

export function hasStarted(activity: Pick<Activity, 'starts_at'>) {
  return new Date(activity.starts_at).getTime() <= Date.now();
}

export function formatDay(date: Date) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// Hosts can confirm who showed up from the start until 7 days after.
export const CHECK_IN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function isCheckInOpen(activity: Pick<Activity, 'starts_at'>) {
  const start = new Date(activity.starts_at).getTime();
  return start <= Date.now() && Date.now() - start < CHECK_IN_WINDOW_MS;
}

export function needsCheckIn(activity: Pick<Activity, 'starts_at' | 'checked_in_at'>) {
  return !activity.checked_in_at && isCheckInOpen(activity);
}
