import type { Profile } from '@/lib/profiles';

// A quick status that runs out on its own. Must match the check in
// supabase/migrations/0015_availability_and_alerts.sql.
export const STATUSES = {
  free_now: { emoji: '🟢', label: 'Free now', color: '#22C55E' },
  busy: { emoji: '🔴', label: 'Busy today', color: '#EF4444' },
  free_tonight: { emoji: '🌙', label: 'Free tonight', color: '#8B5CF6' },
  free_weekend: { emoji: '📅', label: 'Free this weekend', color: '#3B82F6' },
} as const;

export type Status = keyof typeof STATUSES;

// When you're usually free, shown on your profile.
export const FREE_TIMES = {
  weekday_daytime: 'Weekday daytime',
  weekday_evenings: 'Weekday evenings',
  weekend_daytime: 'Weekend daytime',
  weekend_evenings: 'Weekend evenings',
} as const;

export type FreeTime = keyof typeof FREE_TIMES;

// When a status runs out if you pick it now.
export function statusUntil(status: Status, now = new Date()) {
  const until = new Date(now);
  if (status === 'free_now') {
    until.setHours(until.getHours() + 3);
  } else if (status === 'free_weekend') {
    // End of the coming Sunday (or today, if it's Sunday).
    until.setDate(until.getDate() + ((7 - until.getDay()) % 7));
    until.setHours(23, 59, 59, 999);
  } else {
    until.setHours(23, 59, 59, 999);
  }
  return until.toISOString();
}

// Someone's status, or null if they haven't set one or it has run out.
export function currentStatus(profile: Pick<Profile, 'status' | 'status_until'> | null) {
  if (!profile?.status || !profile.status_until) return null;
  if (new Date(profile.status_until).getTime() <= Date.now()) return null;
  return profile.status;
}
