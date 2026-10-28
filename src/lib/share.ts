import { Share } from 'react-native';

import { Audiences, Categories, formatDay, formatTime, type Activity } from '@/lib/activities';
import { displayName, type Profile } from '@/lib/profiles';
import { rankFor } from '@/lib/ranks';

// Shared links go to a small page (docs/open.html on GitHub Pages) that opens the app if
// it's installed, or offers the download. The page never shows anyone's details.
const LINK_BASE = 'https://dylanashleyalves.github.io/whos-down/open.html';

export function profileLink(userId: string) {
  return `${LINK_BASE}?u=${userId}`;
}

export function activityLink(activityId: string) {
  return `${LINK_BASE}?a=${activityId}`;
}

export async function shareProfile(profile: Profile, xp: number | null, isMe: boolean) {
  const rank = xp === null ? null : rankFor(xp);
  const details = [rank && `${rank.emoji} ${rank.name}`, profile.city].filter(Boolean).join(' · ');
  const intro = isMe ? "I'm on Who's Down. Come find me" : `Check out ${displayName(profile)} on Who's Down`;
  await Share.share({
    message: `${intro}${details ? ` (${details})` : ''} 👇\n${profileLink(profile.id)}`,
  });
}

export async function shareActivity(activity: Activity) {
  const startsAt = new Date(activity.starts_at);
  const category = Categories[activity.category];
  const audience = activity.audience !== 'everyone' ? ` (${Audiences[activity.audience].label})` : '';
  await Share.share({
    message:
      `Who's down? ${category.emoji} ${activity.title}${audience}\n` +
      `🕒 ${formatDay(startsAt)} · ${formatTime(startsAt)}\n` +
      `📍 ${activity.location}\n` +
      `Join here 👇\n${activityLink(activity.id)}`,
  });
}
