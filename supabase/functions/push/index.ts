// Sends push notifications through Expo's push service.
// Called by database triggers (new group message, direct message, someone joining, a new
// activity, kudos, someone in your crew being free, "I'm down too" on an idea, an idea
// being hosted) and
// every 15 minutes by a cron job for reminders. See 0011_push_notifications.sql.
//
// Secret (Supabase Dashboard -> Edge Functions -> Secrets):
//   PUSH_WEBHOOK_SECRET - same value as the push_webhook_secret in the Vault
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Which Settings switch each push belongs to (columns on profile_private, see
// 0013_settings.sql, 0015_availability_and_alerts.sql and 0019_crew_status.sql).
type Kind = 'messages' | 'joins' | 'reminders' | 'nudges' | 'activities' | 'kudos' | 'crew';
const SWITCH: Record<Kind, string> = {
  messages: 'notify_messages',
  joins: 'notify_joins',
  reminders: 'notify_reminders',
  nudges: 'notify_nudges',
  activities: 'notify_activities',
  kudos: 'notify_kudos',
  crew: 'notify_crew_status',
};

type Push = { userId: string; kind: Kind; title: string; body: string; href: string };

const MINUTE = 60 * 1000;
const PREVIEW_LENGTH = 120;
// Errors Expo reported for this request's notifications, so they show up in the reply
// (net._http_response in the SQL Editor). Reset for each request.
let deliveryErrors: string[] = [];

// At most this many "new activity" alerts per person a day.
const ACTIVITY_ALERTS_PER_DAY = 3;
// Posts outside your interests stop sooner, so there's always room for one that matches.
const OTHER_ACTIVITY_ALERTS_PER_DAY = 2;

function preview(text: string) {
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH - 1)}…` : text;
}

async function nameOf(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle();
  return (data?.display_name as string | undefined) ?? 'Someone';
}

// Everyone at an activity: the host plus whoever joined.
async function participantsOf(activityId: string) {
  const [activity, members] = await Promise.all([
    supabase.from('activities').select('host_id, title').eq('id', activityId).maybeSingle(),
    supabase.from('activity_members').select('user_id').eq('activity_id', activityId),
  ]);
  const ids = new Set((members.data ?? []).map((m) => m.user_id as string));
  if (activity.data) ids.add(activity.data.host_id as string);
  return { title: (activity.data?.title as string | undefined) ?? 'your activity', ids: [...ids] };
}

// Drops people who blocked (or were blocked by) the sender.
async function withoutBlocked(userIds: string[], senderId: string) {
  if (userIds.length === 0) return userIds;
  const { data } = await supabase
    .from('blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${senderId},blocked_id.eq.${senderId}`);
  const blocked = new Set(
    (data ?? []).map((b) => (b.blocker_id === senderId ? b.blocked_id : b.blocker_id) as string)
  );
  return userIds.filter((id) => !blocked.has(id));
}

// Only send each reminder once: returns the people it hadn't been sent to yet.
async function firstTime(userIds: string[], kind: string, ref: string) {
  if (userIds.length === 0) return [];
  const { data } = await supabase
    .from('notification_log')
    .upsert(
      userIds.map((user_id) => ({ user_id, kind, ref })),
      { onConflict: 'user_id,kind,ref', ignoreDuplicates: true }
    )
    .select('user_id');
  return (data ?? []).map((row) => row.user_id as string);
}

async function send(pushes: Push[]) {
  if (pushes.length === 0) return 0;
  const userIds = [...new Set(pushes.map((p) => p.userId))];

  // Respect the master switch and each type's switch, and look up each person's phones.
  const [prefs, tokens] = await Promise.all([
    supabase
      .from('profile_private')
      .select(
        'id, notifications_enabled, notify_messages, notify_joins, notify_reminders, notify_nudges, notify_activities, notify_kudos, notify_crew_status'
      )
      .in('id', userIds),
    supabase.from('push_tokens').select('token, user_id').in('user_id', userIds),
  ]);
  if (prefs.error) throw prefs.error;
  const prefsById = new Map(
    (prefs.data ?? []).map((p) => [p.id as string, p as Record<string, unknown>])
  );
  const wants = (push: Push) => {
    const p = prefsById.get(push.userId);
    return !p || (p.notifications_enabled !== false && p[SWITCH[push.kind]] !== false);
  };

  const messages = pushes.flatMap((push) =>
    !wants(push)
      ? []
      : (tokens.data ?? [])
          .filter((t) => t.user_id === push.userId)
          .map((t) => ({
            to: t.token as string,
            title: push.title,
            body: push.body,
            data: { href: push.href },
            sound: 'default',
            channelId: 'default',
          }))
  );

  // Expo accepts up to 100 notifications per request.
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
    const result = await response.json();
    if (!response.ok || result.errors) deliveryErrors.push(JSON.stringify(result.errors ?? result));
    for (const ticket of (result.data ?? []) as {
      status: string;
      id?: string;
      message?: string;
    }[]) {
      if (ticket.status === 'error') deliveryErrors.push(ticket.message ?? 'unknown error');
    }
    // Forget phones that uninstalled the app or turned notifications off at the system level.
    const dead = ((result.data ?? []) as { status: string; details?: { error?: string } }[])
      .map((ticket, n) => (ticket.details?.error === 'DeviceNotRegistered' ? batch[n].to : null))
      .filter((token): token is string => token !== null);
    if (dead.length > 0) await supabase.from('push_tokens').delete().in('token', dead);
  }
  return messages.length;
}

async function onGroupMessage(record: { activity_id: string; user_id: string; body: string }) {
  const [{ title, ids }, sender] = await Promise.all([
    participantsOf(record.activity_id),
    nameOf(record.user_id),
  ]);
  const recipients = await withoutBlocked(
    ids.filter((id) => id !== record.user_id),
    record.user_id
  );
  return send(
    recipients.map((userId) => ({
      userId,
      kind: 'messages' as const,
      title: `💬 ${title}`,
      body: `${sender}: ${preview(record.body)}`,
      href: `/chat/${record.activity_id}`,
    }))
  );
}

async function onDirectMessage(record: { sender_id: string; recipient_id: string; body: string }) {
  const sender = await nameOf(record.sender_id);
  return send([
    {
      userId: record.recipient_id,
      kind: 'messages',
      title: `💬 ${sender}`,
      body: preview(record.body),
      href: `/dm/${record.sender_id}`,
    },
  ]);
}

async function onJoin(record: { activity_id: string; user_id: string }) {
  const [{ data: activity }, joiner] = await Promise.all([
    supabase.from('activities').select('host_id, title').eq('id', record.activity_id).maybeSingle(),
    nameOf(record.user_id),
  ]);
  if (!activity) return 0;
  return send([
    {
      userId: activity.host_id as string,
      kind: 'joins',
      title: '🙋 Someone is down!',
      body: `${joiner} joined ${activity.title}`,
      href: `/activity/${record.activity_id}`,
    },
  ]);
}

// Same labels as Categories in src/lib/activities.ts.
const CATEGORY_EMOJI: Record<string, string> = {
  sports: '🏀',
  gym: '🏋️',
  gaming: '🎮',
  food: '🍜',
  outdoors: '🥾',
  hangout: '🍻',
};

// A new activity: tell people in the same country who have its type as an interest, can
// join it (guys-only / girls-only), aren't busy, and haven't had 3 of these today.
async function onActivity(record: {
  id: string;
  host_id: string;
  title: string;
  category: string;
  country: string | null;
  audience: string;
  starts_at: string;
}) {
  if (!record.country) return 0;
  const now = new Date().toISOString();
  const { data: people } = await supabase
    .from('profiles')
    .select('id, status, status_until, interests')
    .eq('country', record.country)
    .neq('id', record.host_id);
  const interested = new Set(
    (people ?? []).filter((p) => p.interests?.includes(record.category)).map((p) => p.id as string)
  );
  let ids = (people ?? [])
    .filter((p) => !(p.status === 'busy' && p.status_until && p.status_until > now))
    .map((p) => p.id as string);

  if (record.audience !== 'everyone' && ids.length > 0) {
    const { data: genders } = await supabase
      .from('profile_private')
      .select('id')
      .in('id', ids)
      .eq('gender', record.audience === 'guys' ? 'guy' : 'girl');
    ids = (genders ?? []).map((g) => g.id as string);
  }
  ids = await withoutBlocked(ids, record.host_id);
  if (ids.length === 0) return 0;

  const { data: today } = await supabase
    .from('notification_log')
    .select('user_id')
    .eq('kind', 'new_activity')
    .in('user_id', ids)
    .gte('sent_at', new Date(Date.now() - 24 * 60 * MINUTE).toISOString());
  const counts = new Map<string, number>();
  for (const row of today ?? []) counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  ids = ids.filter(
    (id) =>
      (counts.get(id) ?? 0) <
      (interested.has(id) ? ACTIVITY_ALERTS_PER_DAY : OTHER_ACTIVITY_ALERTS_PER_DAY)
  );

  const host = await nameOf(record.host_id);
  const recipients = await firstTime(ids, 'new_activity', record.id);
  return send(
    recipients.map((userId) => ({
      userId,
      kind: 'activities' as const,
      title: `${CATEGORY_EMOJI[record.category] ?? '✨'} Who's down?`,
      body: `${host} posted: ${preview(record.title)}`,
      href: `/activity/${record.id}`,
    }))
  );
}

// Kudos say who gave them (profiles only show counts). One push per person per activity,
// however many tags.
const KUDOS_LABEL: Record<string, string> = {
  friendly: '😊 Friendly',
  on_time: '⏰ On time',
  great_vibes: '✨ Great vibes',
  welcoming: '🤗 Welcoming',
  funny: '😂 Funny',
  skilled: '🏆 Skilled',
};

async function onKudos(record: {
  activity_id: string;
  from_user: string;
  to_user: string;
  tag: string;
}) {
  const ref = `${record.activity_id}:${record.from_user}`;
  if ((await firstTime([record.to_user], 'kudos', ref)).length === 0) return 0;
  const [{ data: activity }, giver] = await Promise.all([
    supabase.from('activities').select('title').eq('id', record.activity_id).maybeSingle(),
    nameOf(record.from_user),
  ]);
  return send([
    {
      userId: record.to_user,
      kind: 'kudos',
      title: `👏 Kudos from ${giver}`,
      body: `${giver} thinks you're ${KUDOS_LABEL[record.tag] ?? 'great'} after ${activity?.title ?? 'your meetup'}. Down to hang again?`,
      // The activity, where they can tap "Hang again?" and give kudos back.
      href: `/activity/${record.activity_id}`,
    },
  ]);
}

// Same as STATUSES in src/lib/availability.ts. Only these two tell your crew.
const CREW_STATUS: Record<string, string> = {
  free_now: '🟢 {name} is free now',
  free_tonight: '🌙 {name} is free tonight',
};

// Someone picked Free now or Free tonight: tell their crew (people who both tapped
// "Hang again?"), unless they're busy. At most one a day from each person, so changing
// status back and forth doesn't spam anyone.
async function onStatus(record: { id: string; status: string }) {
  const title = CREW_STATUS[record.status];
  if (!title) return 0;
  const [picked, pickedBy] = await Promise.all([
    supabase.from('hang_again').select('to_user').eq('from_user', record.id),
    supabase.from('hang_again').select('from_user').eq('to_user', record.id),
  ]);
  const theyPicked = new Set((picked.data ?? []).map((row) => row.to_user as string));
  let ids = (pickedBy.data ?? [])
    .map((row) => row.from_user as string)
    .filter((id) => theyPicked.has(id));
  ids = await withoutBlocked(ids, record.id);
  if (ids.length === 0) return 0;

  const { data: busy } = await supabase
    .from('profiles')
    .select('id')
    .in('id', ids)
    .eq('status', 'busy')
    .gt('status_until', new Date().toISOString());
  const busyIds = new Set((busy ?? []).map((row) => row.id as string));
  ids = ids.filter((id) => !busyIds.has(id));

  // The date in Singapore (UTC+8), so "a day" ends at local midnight.
  const day = new Date(Date.now() + 8 * 60 * MINUTE).toISOString().slice(0, 10);
  const recipients = await firstTime(ids, 'crew_status', `${record.id}:${day}`);
  if (recipients.length === 0) return 0;
  const name = await nameOf(record.id);
  return send(
    recipients.map((userId) => ({
      userId,
      kind: 'crew' as const,
      title: title.replace('{name}', name),
      body: 'Down to hang? Send them a message.',
      href: `/dm/${record.id}`,
    }))
  );
}

// Once this many people (including whoever posted it) are down for an idea, everyone hears.
const IDEA_READY_AT = 3;

// Everyone down for an idea: whoever posted it plus everyone who tapped "I'm down too".
async function ideaPeople(ideaId: string) {
  const [idea, interest] = await Promise.all([
    supabase.from('ideas').select('user_id, title, category').eq('id', ideaId).maybeSingle(),
    supabase.from('idea_interest').select('user_id').eq('idea_id', ideaId),
  ]);
  if (!idea.data) return null;
  const ids = new Set((interest.data ?? []).map((row) => row.user_id as string));
  ids.add(idea.data.user_id as string);
  return {
    ownerId: idea.data.user_id as string,
    title: idea.data.title as string,
    emoji: CATEGORY_EMOJI[idea.data.category as string] ?? '✨',
    ids: [...ids],
  };
}

// Someone tapped "I'm down too": tell whoever posted it (once per person), and once enough
// people are keen, tell all of them so someone hosts it.
async function onIdeaInterest(record: { idea_id: string; user_id: string }) {
  const idea = await ideaPeople(record.idea_id);
  if (!idea) return 0;
  const pushes: Push[] = [];

  const [owner] = await withoutBlocked([idea.ownerId], record.user_id);
  if (
    owner &&
    (await firstTime([owner], 'idea_interest', `${record.idea_id}:${record.user_id}`)).length > 0
  ) {
    pushes.push({
      userId: owner,
      kind: 'joins',
      title: `🙌 ${await nameOf(record.user_id)} is down too`,
      body: `For your idea: ${preview(idea.title)}`,
      href: `/idea/${record.idea_id}`,
    });
  }

  if (idea.ids.length >= IDEA_READY_AT) {
    for (const userId of await firstTime(idea.ids, 'idea_ready', record.idea_id)) {
      pushes.push({
        userId,
        kind: 'activities',
        title: `🔥 ${idea.ids.length} people are down!`,
        body: `${idea.emoji} ${preview(idea.title)}. Tap "Host it" to pick a time and place.`,
        href: `/idea/${record.idea_id}`,
      });
    }
  }
  return send(pushes);
}

// Someone hosted an idea as a real activity: tell everyone who was keen so they can join.
async function onIdeaHosted(record: { idea_id: string; activity_id: string; host_id: string }) {
  const [idea, activity] = await Promise.all([
    ideaPeople(record.idea_id),
    supabase
      .from('activities')
      .select('title, starts_at')
      .eq('id', record.activity_id)
      .maybeSingle(),
  ]);
  if (!idea || !activity.data) return 0;
  const ids = await withoutBlocked(
    idea.ids.filter((id) => id !== record.host_id),
    record.host_id
  );
  const recipients = await firstTime(ids, 'idea_hosted', record.idea_id);
  if (recipients.length === 0) return 0;
  const host = await nameOf(record.host_id);
  const when = new Date(activity.data.starts_at as string).toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
  return send(
    recipients.map((userId) => ({
      userId,
      kind: 'activities' as const,
      title: "🎉 It's on!",
      body: `${host} is hosting ${preview(activity.data.title as string)}, ${when}. Tap to grab a spot.`,
      href: `/activity/${record.activity_id}`,
    }))
  );
}

async function reminders() {
  const now = Date.now();
  const pushes: Push[] = [];

  // Starting in about an hour: everyone going.
  const { data: soon } = await supabase
    .from('activities')
    .select('id, title')
    .gte('starts_at', new Date(now + 45 * MINUTE).toISOString())
    .lt('starts_at', new Date(now + 75 * MINUTE).toISOString());
  for (const activity of soon ?? []) {
    const { ids } = await participantsOf(activity.id);
    for (const userId of await firstTime(ids, 'starts_soon', activity.id)) {
      pushes.push({
        userId,
        kind: 'reminders',
        title: '⏰ Starting in an hour',
        body: `${activity.title}. See you there!`,
        href: `/activity/${activity.id}`,
      });
    }
  }

  // Started 1 to 3 hours ago and not checked in yet: remind the host.
  const { data: ended } = await supabase
    .from('activities')
    .select('id, title, host_id, activity_members(count)')
    .is('checked_in_at', null)
    .gte('starts_at', new Date(now - 180 * MINUTE).toISOString())
    .lt('starts_at', new Date(now - 60 * MINUTE).toISOString());
  for (const activity of ended ?? []) {
    const members = (activity.activity_members as { count: number }[])[0]?.count ?? 0;
    if (members === 0) continue;
    if ((await firstTime([activity.host_id], 'check_in', activity.id)).length === 0) continue;
    pushes.push({
      userId: activity.host_id,
      kind: 'reminders',
      title: '📋 Who showed up?',
      body: `Check people in for ${activity.title} to earn XP.`,
      href: `/activity/${activity.id}`,
    });
  }

  // Not opened the app for a week: a friendly nudge, at most once a week, sent in the
  // early evening in Singapore (11:00 UTC) rather than every 15 minutes.
  const date = new Date(now);
  if (date.getUTCHours() === 11 && date.getUTCMinutes() < 15) {
    const { data: quiet } = await supabase
      .from('profile_private')
      .select('id')
      .eq('notifications_enabled', true)
      .eq('notify_nudges', true)
      .lt('last_seen_at', new Date(now - 7 * 24 * 60 * MINUTE).toISOString());
    const week = `${date.getUTCFullYear()}-w${Math.floor(now / (7 * 24 * 60 * MINUTE))}`;
    for (const userId of await firstTime(
      (quiet ?? []).map((q) => q.id as string),
      'inactive',
      week
    )) {
      pushes.push({
        userId,
        kind: 'nudges',
        title: '👋 Been quiet lately?',
        body: "See who's down this week, or post something and ask people out.",
        href: '/',
      });
    }
  }

  return send(pushes);
}

Deno.serve(async (request) => {
  if (request.headers.get('x-webhook-secret') !== Deno.env.get('PUSH_WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { type, record } = await request.json();
    deliveryErrors = [];
    // Which trigger sent this (the argument to notify_push in the migrations).
    // deno-lint-ignore no-explicit-any
    const handlers: Record<string, (record: any) => Promise<number>> = {
      message: onGroupMessage,
      dm: onDirectMessage,
      join: onJoin,
      activity: onActivity,
      kudos: onKudos,
      status: onStatus,
      idea_interest: onIdeaInterest,
      idea_hosted: onIdeaHosted,
      reminders: () => reminders(),
    };
    const handler = handlers[type as string];
    const sent = handler ? await handler(record) : 0;
    const problems = deliveryErrors.length > 0 ? ` (errors: ${deliveryErrors.join('; ')})` : '';
    return new Response(`Sent ${sent}${problems}`, { status: 200 });
  } catch (error) {
    // Reply with the error, so it shows up in net._http_response from the SQL Editor.
    console.error(error);
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return new Response(`Error: ${message}`, { status: 500 });
  }
});
