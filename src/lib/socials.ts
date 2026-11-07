import { supabase } from '@/lib/supabase';

// Socials only your crew can see. Rows are hidden from everyone else by the database,
// so nobody else can tell whether you've added any.
export type SocialKey = 'instagram' | 'telegram' | 'tiktok' | 'spotify';
export type Socials = Record<SocialKey, string | null>;

export const SOCIALS: Record<
  SocialKey,
  {
    label: string;
    placeholder: string;
    pattern: RegExp;
    problem: string;
    url: (id: string) => string;
  }
> = {
  instagram: {
    label: 'Instagram',
    placeholder: 'Instagram username',
    pattern: /^[a-z0-9._]{1,30}$/,
    problem: 'That Instagram username doesn’t look right.',
    url: (id) => `https://www.instagram.com/${id}`,
  },
  telegram: {
    label: 'Telegram',
    placeholder: 'Telegram username',
    pattern: /^[a-z0-9_]{5,32}$/,
    problem: 'That Telegram username doesn’t look right. It needs at least 5 characters.',
    url: (id) => `https://t.me/${id}`,
  },
  tiktok: {
    label: 'TikTok',
    placeholder: 'TikTok username',
    pattern: /^[a-z0-9._]{2,24}$/,
    problem: 'That TikTok username doesn’t look right.',
    url: (id) => `https://www.tiktok.com/@${id}`,
  },
  spotify: {
    label: 'Spotify',
    placeholder: 'Spotify profile link',
    pattern: /^[A-Za-z0-9._-]{1,64}$/,
    problem:
      'That isn\'t a Spotify profile link. Tap "Where do I find my link?" under the box for the steps.',
    url: (id) => `https://open.spotify.com/user/${id}`,
  },
};

export const SOCIAL_KEYS = Object.keys(SOCIALS) as SocialKey[];

// Where to find your username or link in each app, for the setup guide.
export const SOCIAL_STEPS: Record<SocialKey, string[]> = {
  instagram: ['Open Instagram and go to your profile.', 'Your username is at the top.'],
  telegram: [
    'Open Telegram and go to Settings.',
    "Your username starts with @. If you don't have one, tap Username to make one.",
  ],
  tiktok: ['Open TikTok and tap Profile.', 'Your username is under your name and starts with @.'],
  spotify: [
    'Open Spotify and tap your picture at the top left.',
    'Tap View profile.',
    'Tap ⋯, then Share, then Copy link.',
    'Come back here and paste it into the Spotify box.',
  ],
};

const PROFILE_LINK =
  /^(https?:\/\/)?(www\.)?(instagram\.com|t\.me|telegram\.me|tiktok\.com|open\.spotify\.com(\/intl-[a-z-]+)?\/user)\//i;

// Accepts "@name", "name" or a full link, and returns just the name.
export function cleanHandle(key: SocialKey, input: string) {
  const handle = input
    .trim()
    .replace(/^spotify:user:/i, '')
    .replace(PROFILE_LINK, '')
    .replace(/^@/, '')
    .replace(/[/?].*$/, '');
  // Spotify's ids are case sensitive. The others aren't.
  return key === 'spotify' ? handle : handle.toLowerCase();
}

// A link we don't recognise, like a Spotify song or a short link, is cut down to its
// domain by cleanHandle, so turn those away here.
export function isValidHandle(key: SocialKey, handle: string) {
  return SOCIALS[key].pattern.test(handle) && !/\.(com|me|link)$/i.test(handle);
}

export async function fetchSocials(userId: string): Promise<Socials | null> {
  const { data, error } = await supabase
    .from('profile_socials')
    .select('instagram, telegram, tiktok, spotify')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) console.warn('Could not load socials', error);
  return (data as Socials | null) ?? null;
}

export async function saveSocials(userId: string, socials: Socials) {
  const { error } = Object.values(socials).some(Boolean)
    ? await supabase.from('profile_socials').upsert({ user_id: userId, ...socials })
    : await supabase.from('profile_socials').delete().eq('user_id', userId);
  if (error) throw error;
}
