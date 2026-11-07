import type { Profile } from '@/lib/profiles';

// The parts of a profile people can reorder or hide. Must match the checks in
// supabase/migrations/0020_profile_layout.sql.
export const PROFILE_SECTIONS = {
  status: { emoji: '🟢', label: 'Your status', detail: 'Free now, Busy today and the rest' },
  about: { emoji: '📝', label: 'About', detail: 'Bio, interests and when you’re free' },
  kudos: { emoji: '👏', label: 'What people think', detail: 'Kudos from meetups' },
  crew: { emoji: '🤝', label: 'Your crew', detail: 'People you’ve met and clicked with' },
  rank: { emoji: '🏆', label: 'Rank', detail: 'Your XP and stats' },
  socials: { emoji: '🔗', label: 'Your socials', detail: 'Instagram, Telegram and more' },
} as const;

export type SectionKey = keyof typeof PROFILE_SECTIONS;

export const DEFAULT_SECTION_ORDER = Object.keys(PROFILE_SECTIONS) as SectionKey[];

// What other people see on your profile. The rest are only on your own page.
export const PUBLIC_SECTIONS: SectionKey[] = ['about', 'kudos', 'rank'];

type Layout = Pick<Profile, 'section_order' | 'hidden_sections'> | null;

function isSection(key: string): key is SectionKey {
  return key in PROFILE_SECTIONS;
}

// Every section in the saved order. Sections added to the app after someone arranged
// their profile go at the end, so nothing new is ever missing.
export function sectionOrder(profile: Layout): SectionKey[] {
  const saved = (profile?.section_order ?? []).filter(isSection);
  const order = [...new Set(saved)];
  for (const key of DEFAULT_SECTION_ORDER) if (!order.includes(key)) order.push(key);
  return order;
}

export function hiddenSections(profile: Layout): Set<SectionKey> {
  return new Set((profile?.hidden_sections ?? []).filter(isSection));
}

// The sections to show, in order, out of the ones this page has.
export function visibleSections(profile: Layout, available: SectionKey[] = DEFAULT_SECTION_ORDER) {
  const hidden = hiddenSections(profile);
  return sectionOrder(profile).filter((key) => available.includes(key) && !hidden.has(key));
}
