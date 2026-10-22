import type { Category } from '@/lib/activities';
import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  display_name: string | null;
  city: string | null;
  bio: string | null;
  interests: Category[];
  avatar_url: string | null;
  created_at: string;
};

export type ProfileSummary = Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;

export const PROFILE_SUMMARY = 'id, display_name, avatar_url';

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
