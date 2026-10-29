import type { FreeTime, Status } from '@/lib/availability';
import type { Category } from '@/lib/activities';
import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  display_name: string | null;
  city: string | null;
  // Two-letter ISO code, e.g. 'SG'. People only see activities from their own country.
  country: string | null;
  bio: string | null;
  interests: Category[];
  avatar_url: string | null;
  created_at: string;
  // Availability (0015). Optional so sample profiles can leave them out.
  status?: Status | null;
  status_until?: string | null;
  free_times?: FreeTime[];
};

export type ProfileSummary = Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;

// Private: only used to decide who can see guys-only or girls-only activities.
export const GENDERS = {
  guy: 'Guy',
  girl: 'Girl',
  unspecified: 'Prefer not to say',
} as const;

export type Gender = keyof typeof GENDERS;

// Only visible to the user themselves.
export type PrivateProfile = {
  id: string;
  birthdate: string;
  accepted_guidelines_at: string;
  confirmed_guy_at: string | null;
  gender: Gender | null;
  notifications_enabled: boolean;
  // Each type of notification. Missing until 0013_settings.sql has been run.
  notify_messages?: boolean;
  notify_joins?: boolean;
  notify_reminders?: boolean;
  notify_nudges?: boolean;
  notify_activities?: boolean;
  notify_kudos?: boolean;
  last_seen_at: string | null;
};

export const MIN_AGE = 18;

// Setup is done once they have a name and country, confirmed their age, said whether
// they're a guy or a girl (or neither), and agreed to the guidelines.
export function isSetupComplete(profile: Profile | null, privateProfile: PrivateProfile | null) {
  return !!profile?.display_name && !!profile.country && !!privateProfile?.gender;
}

// Builds a real calendar date from what the user typed, or null if it isn't one.
export function parseBirthdate(day: string, month: string, year: string) {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y) || y < 1900) return null;

  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

export function ageOn(birthdate: Date, today = new Date()) {
  let age = today.getFullYear() - birthdate.getUTCFullYear();
  const hadBirthday =
    today.getMonth() > birthdate.getUTCMonth() ||
    (today.getMonth() === birthdate.getUTCMonth() && today.getDate() >= birthdate.getUTCDate());
  if (!hadBirthday) age -= 1;
  return age;
}

export const PROFILE_SUMMARY = 'id, display_name, avatar_url';

// "dylan123@gmail.com" -> "d•••••••@gmail.com", so screenshots don't show the address.
export function maskEmail(email: string | null | undefined) {
  if (!email) return '';
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.charAt(0)}${'•'.repeat(Math.max(name.length - 1, 3))}@${domain}`;
}

export function displayName(profile: Pick<Profile, 'display_name'> | null | undefined) {
  return profile?.display_name ?? 'Someone';
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Uploads a picked photo to the public "avatars" bucket and returns its URL.
// Uses the picker's base64 data: reading the file with fetch() can upload an
// empty file on phones, which shows up as a blank avatar.
export async function uploadAvatar(userId: string, base64: string, mimeType?: string | null) {
  const contentType = mimeType ?? 'image/jpeg';
  const extension = contentType.split('/')[1] ?? 'jpg';
  const path = `${userId}/${Date.now()}.${extension}`;

  const body = base64ToBytes(base64);
  if (body.byteLength === 0) throw new Error('That photo could not be read. Try another one.');

  const { error } = await supabase.storage.from('avatars').upload(path, body, { contentType });
  if (error) throw error;

  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
