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

// Uploads a picked photo to the public "avatars" bucket and returns its URL.
export async function uploadAvatar(userId: string, uri: string, mimeType?: string | null) {
  const contentType = mimeType ?? 'image/jpeg';
  const extension = contentType.split('/')[1] ?? 'jpg';
  const path = `${userId}/${Date.now()}.${extension}`;

  const body = await fetch(uri).then((response) => response.arrayBuffer());
  const { error } = await supabase.storage.from('avatars').upload(path, body, { contentType });
  if (error) throw error;

  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
