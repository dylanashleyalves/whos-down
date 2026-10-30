import { supabase } from '@/lib/supabase';

// Socials only your crew can see. Rows are hidden from everyone else by the database,
// so nobody else can tell whether you've added any.
export type Socials = { instagram: string | null; telegram: string | null };

// Accepts "@name", "name" or a full link, and returns just the lowercase name.
export function cleanHandle(input: string) {
  return input
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?(instagram\.com|t\.me|telegram\.me)\//i, '')
    .replace(/^@/, '')
    .replace(/[/?].*$/, '')
    .toLowerCase();
}

export const isInstagramHandle = (handle: string) => /^[a-z0-9._]{1,30}$/.test(handle);
export const isTelegramHandle = (handle: string) => /^[a-z0-9_]{5,32}$/.test(handle);

export async function fetchSocials(userId: string): Promise<Socials | null> {
  const { data, error } = await supabase
    .from('profile_socials')
    .select('instagram, telegram')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) console.warn('Could not load socials', error);
  return (data as Socials | null) ?? null;
}

export async function saveSocials(userId: string, socials: Socials) {
  const { error } =
    socials.instagram || socials.telegram
      ? await supabase.from('profile_socials').upsert({ user_id: userId, ...socials })
      : await supabase.from('profile_socials').delete().eq('user_id', userId);
  if (error) throw error;
}
