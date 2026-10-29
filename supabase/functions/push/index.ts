// Sends push notifications through Expo's push service.
// Called by database triggers (new group message, direct message, someone joining, a new
// activity, kudos) and
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
// 0013_settings.sql and 0015_availability_and_alerts.sql).
type Kind = 'messages' | 'joins' | 'reminders' | 'nudges' | 'activities' | 'kudos';
const SWITCH: Record<Kind, string> = {
  messages: 'notify_messages',
  joins: 'notify_joins',
  reminders: 'notify_reminders',
  nudges: 'notify_nudges',
  activities: 'notify_activities',
  kudos: 'notify_kudos',
};

type Push = { userId: string; kind: Kind; title: string; body: string; href: string };

const MINUTE = 60 * 1000;
const PREVIEW_LENGTH = 120;
// Errors Expo reported for this request's notifications, so they show up in the reply
// (net._http_response in the SQL Editor). Reset for each request.
let deliveryErrors: string[] = [];
let ticketIds: string[] = [];

// Expo hands each notification to Google (Android) or Apple a moment after accepting it.
// Asks how that went, so failures there (e.g. bad Firebase credentials) show up too.
async function checkReceipts() {
  if (ticketIds.length === 0) return;
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ids: ticketIds }),
  });
  const result = await response.json();
  const receipts = Object.values(result.data ?? {}) as {
    status: string;
    message?: string;
    details?: { error?: string };
  }[];
  for (const receipt of receipts) {
    if (receipt.status === 'error') {
      deliveryErrors.push(`${receipt.details?.error ?? ''} ${receipt.message ?? ''}`.trim());
    }
  }
  if (receipts.length < ticketIds.length) {
    deliveryErrors.push(`${ticketIds.length - receipts.length} not delivered yet`);
  }
}

// At most this many "new activity" alerts per person a day.
const ACTIVITY_ALERTS_PER_DAY = 3;

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
        'id, notifications_enabled, notify_messages, notify_joins, notify_reminders, notify_nudges, notify_activities, notify_kudos'
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
      else if (ticket.id) ticketIds.push(ticket.id);
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
    .select('id, status, status_until')
    .eq('country', record.country)
    .contains('interests', [record.category])
    .neq('id', record.host_id);
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
  ids = ids.filter((id) => (counts.get(id) ?? 0) < ACTIVITY_ALERTS_PER_DAY);

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

// Kudos never say who gave them. One push per person per activity, however many tags.
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
  const { data: activity } = await supabase
    .from('activities')
    .select('title')
    .eq('id', record.activity_id)
    .maybeSingle();
  return send([
    {
      userId: record.to_user,
      kind: 'kudos',
      title: '👏 You got kudos!',
      body: `Someone from ${activity?.title ?? 'your meetup'} thinks you're ${KUDOS_LABEL[record.tag] ?? 'great'}. Down to hang again?`,
      href: '/profile',
    },
  ]);
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
    ticketIds = [];
    const sent =
      type === 'message'
        ? await onGroupMessage(record)
        : type === 'dm'
          ? await onDirectMessage(record)
          : type === 'join'
            ? await onJoin(record)
            : type === 'activity'
              ? await onActivity(record)
              : type === 'kudos'
                ? await onKudos(record)
                : type === 'reminders'
                  ? await reminders()
                  : 0;
    await checkReceipts();
    const problems = deliveryErrors.length > 0 ? ` (errors: ${deliveryErrors.join('; ')})` : '';
    return new Response(`Sent ${sent}${problems}`, { status: 200 });
  } catch (error) {
    // Reply with the error, so it shows up in net._http_response from the SQL Editor.
    console.error(error);
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return new Response(`Error: ${message}`, { status: 500 });
  }
});
