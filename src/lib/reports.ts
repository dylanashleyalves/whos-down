import { supabase } from '@/lib/supabase';

export const REPORT_REASONS = {
  harassment: 'Harassment or threats',
  inappropriate: 'Inappropriate content',
  unsafe: 'Unsafe behaviour at a meetup',
  fake: 'Fake profile',
  underage: 'Under 18',
  not_a_guy: 'Not a guy',
  spam: 'Spam, selling or scams',
  other: 'Something else',
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;
export type ReportStatus = 'open' | 'reviewed' | 'actioned';

// A report with the names and titles a moderator needs (from admin_reports()).
export type AdminReport = {
  id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  reporter_id: string;
  reporter_name: string | null;
  reported_user_id: string | null;
  reported_user_name: string | null;
  activity_id: string | null;
  activity_title: string | null;
  activity_host_id: string | null;
  activity_host_name: string | null;
  // Whether the person a moderator would act on (reported user, or the host) is banned.
  target_banned: boolean;
};

export type BannedUser = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  reason: string | null;
  banned_at: string;
};

// Everyone who's banned (from admin_banned_users()).
export async function fetchBannedUsers() {
  const { data, error } = await supabase.rpc('admin_banned_users');
  if (error) throw error;
  return data as BannedUser[];
}

export async function fetchAdminReports() {
  const { data, error } = await supabase.rpc('admin_reports');
  if (error) throw error;
  return data as AdminReport[];
}
