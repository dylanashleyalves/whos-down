import type { Audience, Category } from '@/lib/activities';
import { PROFILE_SUMMARY, type ProfileSummary } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

// "I'd be down for…": an idea without a set time or place (0021_down_for.sql).

// `lasts` is how long an idea with this timing stays up (idea_expiry in
// 0025_idea_expiry.sql), unless someone hosts it first.
export const Timings = {
  flexible: { label: 'Flexible', emoji: '🤷', lasts: 'for 14 days' },
  weekday_evenings: { label: 'Weekday evenings', emoji: '🌆', lasts: 'until Friday next week' },
  weekends: { label: 'Weekends', emoji: '☀️', lasts: 'for the next two weekends' },
  this_week: { label: 'This week', emoji: '📅', lasts: 'until Sunday night' },
  next_week: { label: 'Next week', emoji: '🗓️', lasts: 'until the end of next week' },
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
  // Set once 3 people report it, until an admin checks it (0022_post_safety.sql).
  hidden_at: string | null;
  created_at: string;
  expires_at: string;
};

// The activity someone made from an idea, when it's been hosted.
export type IdeaPlan = { id: string; title: string; starts_at: string };

export type IdeaWithPeople = Idea & {
  poster: ProfileSummary | null;
  interest: { user_id: string; profile: ProfileSummary | null }[];
  // Only loaded for hosted ideas (fetchMyHostedIdeas). Null if you can't see the activity.
  activity?: IdeaPlan | null;
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
    .is('hidden_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data as unknown as IdeaWithPeople[];
}

// How long after a hosted plan starts its "It's on!" card stays up.
const PLAN_SHOWN_AFTER_START_MS = 6 * 60 * 60 * 1000;

// Ideas you posted or were down for that someone has hosted, so you can find the plan.
// They leave the open ideas once hosted, and you aren't joined automatically.
export async function fetchMyHostedIdeas(myId: string | undefined) {
  if (!myId) return [];
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('ideas')
    .select(`${IDEA_WITH_PEOPLE}, activity:activities(id, title, starts_at)`)
    .not('activity_id', 'is', null)
    .is('hidden_at', null)
    .gt('hosted_at', since)
    .order('hosted_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data as unknown as IdeaWithPeople[]).filter(
    (idea) =>
      isDown(idea, myId) &&
      !!idea.activity &&
      new Date(idea.activity.starts_at).getTime() + PLAN_SHOWN_AFTER_START_MS > Date.now()
  );
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
