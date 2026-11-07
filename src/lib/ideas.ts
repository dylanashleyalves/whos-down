import type { Audience, Category } from '@/lib/activities';
import { PROFILE_SUMMARY, type ProfileSummary } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

// "I'd be down for…": an idea without a set time or place (0021_down_for.sql).

export const Timings = {
  flexible: { label: 'Flexible', emoji: '🤷' },
  weekday_evenings: { label: 'Weekday evenings', emoji: '🌆' },
  weekends: { label: 'Weekends', emoji: '☀️' },
  this_week: { label: 'This week', emoji: '📅' },
  next_week: { label: 'Next week', emoji: '🗓️' },
} as const;

export type Timing = keyof typeof Timings;

export const GroupSizes = {
  not_sure: { label: 'Not sure yet', short: 'Any size', emoji: '🤔' },
  small: { label: 'Small, 2–3', short: '2–3 people', emoji: '👥' },
  medium: { label: 'A group, 4–6', short: '4–6 people', emoji: '👨‍👩‍👧' },
  big: { label: 'The more the merrier', short: 'The more the merrier', emoji: '🎉' },
} as const;

export type GroupSize = keyof typeof GroupSizes;

// A sensible number of spots when someone hosts it.
export const SPOTS_FOR_SIZE: Record<GroupSize, number> = {
  not_sure: 4,
  small: 2,
  medium: 5,
  big: 8,
};

// Once this many people (including whoever posted it) are down, everyone is told.
export const IDEA_READY_AT = 3;

// Each person can have this many ideas up at once (also enforced in the database).
export const MAX_OPEN_IDEAS = 3;

export type Idea = {
  id: string;
  user_id: string;
  title: string;
  category: Category;
  area: string | null;
  timing: Timing;
  group_size: GroupSize;
  note: string | null;
  audience: Audience;
  activity_id: string | null;
  created_at: string;
  expires_at: string;
};

export type IdeaWithPeople = Idea & {
  poster: ProfileSummary | null;
  interest: { user_id: string; profile: ProfileSummary | null }[];
};

export const IDEA_WITH_PEOPLE = `*,
  poster:profiles!ideas_user_id_fkey(${PROFILE_SUMMARY}),
  interest:idea_interest(user_id, profile:profiles(${PROFILE_SUMMARY}))`;

// Everyone down for it, the person who posted it first.
export function peopleDown(idea: IdeaWithPeople): ProfileSummary[] {
  const others = idea.interest.flatMap((row) => (row.profile ? [row.profile] : []));
  return idea.poster ? [idea.poster, ...others] : others;
}

export function isDown(idea: IdeaWithPeople, myId: string | undefined) {
  return !!myId && (idea.user_id === myId || idea.interest.some((row) => row.user_id === myId));
}

// Open ideas nearby that nobody has hosted yet, newest first. The database already limits
// them to your country and leaves out anyone blocked.
export async function fetchOpenIdeas() {
  const { data, error } = await supabase
    .from('ideas')
    .select(IDEA_WITH_PEOPLE)
    .is('activity_id', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data as unknown as IdeaWithPeople[];
}

export async function fetchIdea(id: string) {
  const { data, error } = await supabase
    .from('ideas')
    .select(IDEA_WITH_PEOPLE)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as IdeaWithPeople | null;
}

export async function setDown(ideaId: string, down: boolean) {
  const { error } = down
    ? await supabase.from('idea_interest').insert({ idea_id: ideaId })
    : await supabase.from('idea_interest').delete().eq('idea_id', ideaId);
  if (error) throw error;
}

// "3 down", short enough to sit next to the "I'm down too" button.
export function downLabel(idea: IdeaWithPeople, myId: string | undefined) {
  const count = idea.interest.length + 1;
  if (count > 1) return `${count} down`;
  return idea.user_id === myId ? 'Just you so far' : 'Be the first!';
}

// Keeps each emoji on the same line as its words.
const NBSP = ' ';

// "Weekends · 4–6 people · Tampines"
export function ideaSummary(idea: Pick<Idea, 'timing' | 'group_size' | 'area'>) {
  return [
    `${Timings[idea.timing].emoji}${NBSP}${Timings[idea.timing].label}`,
    `${GroupSizes[idea.group_size].emoji}${NBSP}${GroupSizes[idea.group_size].short}`,
    idea.area && `📍${NBSP}${idea.area}`,
  ]
    .filter(Boolean)
    .join('  ·  ');
}

export function daysLeft(idea: Pick<Idea, 'expires_at'>) {
  return Math.max(
    0,
    Math.ceil((new Date(idea.expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  );
}
