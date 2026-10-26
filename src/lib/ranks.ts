import { supabase } from '@/lib/supabase';

// Ranks use XP from the last 90 days (worked out in the database), so they drop
// if someone stops going out. See supabase/migrations/0008_ranks.sql for the XP rules.
export const RANKS = [
  { name: 'Rookie', emoji: '🌱', minXp: 0 },
  { name: 'Regular', emoji: '🥉', minXp: 50 },
  { name: 'Squad', emoji: '🥈', minXp: 150 },
  { name: 'Crew Captain', emoji: '🥇', minXp: 300 },
  { name: 'Legend', emoji: '🏆', minXp: 600 },
] as const;

export type Rank = (typeof RANKS)[number];

export function rankFor(xp: number): Rank {
  return [...RANKS].reverse().find((rank) => xp >= rank.minXp) ?? RANKS[0];
}

export function nextRank(xp: number): Rank | null {
  return RANKS.find((rank) => rank.minXp > xp) ?? null;
}

// Friendship level from how many real meetups two crew members have shared.
export function friendshipLevel(timesTogether: number) {
  if (timesTogether >= 8) return 'Day one 🤝';
  if (timesTogether >= 4) return 'Good friend';
  if (timesTogether >= 2) return 'Friend';
  return 'Met';
}

export type UserStats = {
  xp_recent: number;
  xp_total: number;
  meetups: number;
  people_met: number;
  streak_weeks: number;
};

export async function fetchUserStats(userId: string) {
  const { data } = await supabase.rpc('user_stats', { target: userId });
  return ((data as UserStats[] | null) ?? [])[0] ?? null;
}

// Recent XP for several people at once, e.g. the hosts on the Feed.
export async function fetchXp(userIds: string[]) {
  const xp = new Map<string, number>();
  if (userIds.length === 0) return xp;
  const { data } = await supabase.rpc('user_xp', { user_ids: [...new Set(userIds)] });
  for (const row of (data ?? []) as { user_id: string; xp_recent: number }[]) {
    xp.set(row.user_id, row.xp_recent);
  }
  return xp;
}

export type CrewFriendship = { times_together: number; last_together: string | null };

// How often and how recently you've met each crew member, keyed by their id.
export async function fetchCrewFriendships() {
  const { data } = await supabase.rpc('crew_friendships');
  const friendships = new Map<string, CrewFriendship>();
  for (const row of (data ?? []) as ({ friend_id: string } & CrewFriendship)[]) {
    friendships.set(row.friend_id, row);
  }
  return friendships;
}

// Whole days since a date, e.g. since you last hung out with someone.
export function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
}
