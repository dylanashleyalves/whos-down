// Sample data for the dev-only demo screens (src/app/demo), used for marketing
// screenshots. These people are fictional and never touch the real database.
import type { IdeaWithPeople } from '@/lib/ideas';
import type { ActivityWithPeople, Category } from '@/lib/activities';
import type { Message } from '@/lib/chat';
import type { Profile } from '@/lib/profiles';

function person(
  id: string,
  name: string,
  city: string,
  bio: string,
  interests: Category[]
): Profile {
  return {
    id,
    display_name: name,
    city,
    country: 'SG',
    bio,
    interests,
    avatar_url: null,
    created_at: '2026-09-01T00:00:00Z',
  };
}

export const DEMO_ME = person(
  'me',
  'Marcus',
  'Bishan',
  'Ball on weekends, gym before work, always down for supper.',
  ['sports', 'gym', 'food']
);

const ryan = person('ryan', 'Ryan', 'Toa Payoh', 'Futsal and FIFA.', ['sports', 'gaming']);
const hafiz = person('hafiz', 'Hafiz', 'Ang Mo Kio', 'Trail runs and hikes.', [
  'outdoors',
  'sports',
]);
const weiJie = person(
  'weijie',
  'Wei Jie',
  'Tampines',
  'Diamond in Valorant, looking for a squad.',
  ['gaming']
);
const arjun = person('arjun', 'Arjun', 'Novena', 'Push, pull, legs.', ['gym']);
const daniel = person('daniel', 'Daniel', 'Serangoon', 'Will travel for good prata.', [
  'food',
  'hangout',
]);

export const DEMO_CREW = [ryan, hafiz, arjun, weiJie, daniel];

// A time `days` from today at the given hour, so the demo always looks upcoming.
function at(days: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  // If that time has already passed (or is within the hour), use the same time a day later,
  // so screenshots taken late at night don't show activities at 1:30 AM.
  if (date.getTime() < Date.now() + 60 * 60 * 1000) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString();
}

function summary(p: Profile) {
  return { id: p.id, display_name: p.display_name, avatar_url: p.avatar_url };
}

function activity(
  id: string,
  host: Profile,
  category: Category,
  title: string,
  location: string,
  startsAt: string,
  spots: number,
  members: Profile[],
  details: string | null = null
): ActivityWithPeople {
  return {
    id,
    host_id: host.id,
    category,
    title,
    location,
    starts_at: startsAt,
    spots,
    details,
    created_at: '2026-10-20T00:00:00Z',
    checked_in_at: null,
    audience: 'everyone',
    host: summary(host),
    members: members.map((m) => ({ user_id: m.id, joined_at: startsAt, profile: summary(m) })),
  };
}

export const DEMO_ACTIVITIES: ActivityWithPeople[] = [
  activity(
    'basketball',
    DEMO_ME,
    'sports',
    'Pickup basketball, need 3 more',
    'Bishan ActiveSG courts',
    at(0, 19),
    5,
    [ryan, hafiz],
    'Casual full court. All levels welcome, just bring water.'
  ),
  activity(
    'valorant',
    weiJie,
    'gaming',
    'Valorant ranked, need a 5th',
    'Online · Discord',
    at(0, 22),
    4,
    [ryan, daniel, arjun]
  ),
  activity(
    'gym',
    arjun,
    'gym',
    'Push day, looking for a spotter',
    'Toa Payoh gym',
    at(1, 7, 30),
    1,
    []
  ),
  activity('prata', daniel, 'food', 'Supper: prata at Jalan Kayu', 'Jalan Kayu', at(2, 23), 4, [
    hafiz,
  ]),
  activity(
    'hike',
    hafiz,
    'outdoors',
    'MacRitchie treetop walk, easy pace',
    'MacRitchie Reservoir',
    at(3, 8),
    6,
    [ryan, weiJie]
  ),
];

export const DEMO_PEOPLE = new Map(
  [DEMO_ME, ryan, hafiz, weiJie, arjun, daniel].map((p) => [p.id, p])
);

// Group chat for the basketball game, oldest first.
const chat: [string, string, number][] = [
  ['me', "Who's down for ball tonight? 🏀", 180],
  ['hafiz', 'Down! What time?', 170],
  ['me', 'Around 7, at Bishan', 165],
  ['ryan', "Count me in, I'll bring a friend if that's cool", 130],
  ['me', 'The more the merrier 💪', 120],
  ['ryan', 'Is it full court or half?', 95],
  ['me', "Full court if we get 6. Courts are free from 7, I'm bringing a ball 🏀", 90],
  ['hafiz', "Nice, I'm in. First time at Bishan, is there parking?", 60],
  ['ryan', 'Yeah, the carpark next to the stadium', 55],
  ['hafiz', "Can someone grab extra water? I'll pay you back", 20],
  ['me', 'On it 👍 See you guys at court 3, by the fence', 5],
];

export const DEMO_MESSAGES: Message[] = chat.map(([userId, body, minutesAgo], i) => ({
  id: `m${i}`,
  activity_id: 'basketball',
  user_id: userId,
  body,
  created_at: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
}));

function idea(
  id: string,
  poster: Profile,
  fields: Pick<IdeaWithPeople, 'title' | 'category' | 'timing' | 'group_size'> &
    Partial<Pick<IdeaWithPeople, 'area' | 'note'>>,
  down: Profile[]
): IdeaWithPeople {
  return {
    id,
    user_id: poster.id,
    area: null,
    note: null,
    audience: 'everyone',
    activity_id: null,
    hidden_at: null,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    ...fields,
    poster: summary(poster),
    interest: down.map((p) => ({ user_id: p.id, profile: summary(p) })),
  };
}

export const DEMO_IDEAS: IdeaWithPeople[] = [
  idea(
    'idea-hotpot',
    daniel,
    {
      title: '🍲 Trying the new hotpot place',
      category: 'food',
      timing: 'weekends',
      group_size: 'not_sure',
      area: 'Bugis',
      note: 'Heard the mala is crazy good',
    },
    [ryan, arjun]
  ),
  idea(
    'idea-hike',
    hafiz,
    {
      title: '🥾 Sunrise hike at Bukit Timah',
      category: 'outdoors',
      timing: 'flexible',
      group_size: 'small',
    },
    [DEMO_ME]
  ),
  idea(
    'idea-badminton',
    weiJie,
    {
      title: '🏸 Badminton, total beginner',
      category: 'sports',
      timing: 'weekday_evenings',
      group_size: 'medium',
      area: 'Tampines',
    },
    []
  ),
];
