// Emails the moderator when someone files a report.
// Triggered by a Supabase Database Webhook on INSERT into public.reports.
//
// Secrets (Supabase Dashboard -> Edge Functions -> Secrets):
//   RESEND_API_KEY  - from resend.com
//   ADMIN_EMAIL     - where alerts go (the email you signed up to Resend with)
//   WEBHOOK_SECRET  - any long random string; the webhook sends it as x-webhook-secret
import { createClient } from 'npm:@supabase/supabase-js@2';

type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  activity_id: string | null;
  reason: string;
  details: string | null;
  created_at: string;
};

const REASONS: Record<string, string> = {
  harassment: 'Harassment or threats',
  inappropriate: 'Inappropriate content',
  unsafe: 'Unsafe behaviour at a meetup',
  fake: 'Fake profile',
  underage: 'Under 18',
  not_a_guy: 'Lying about being a guy or girl',
  spam: 'Spam, selling or scams',
  other: 'Something else',
};

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// Resend only shows a new key once; copying it later gives a masked "re_••••" value.
function resendKey() {
  const key = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
  if (!/^[\x21-\x7e]+$/.test(key)) {
    throw new Error(
      'RESEND_API_KEY is missing or has invalid characters. Create a new key in Resend and copy it right away.'
    );
  }
  return key;
}

// Typed by hand, so check it's a plain address (copying a masked one brings "•" along).
function adminEmail() {
  const email = (Deno.env.get('ADMIN_EMAIL') ?? '').trim();
  if (!/^[\x21-\x7e]+@[\x21-\x7e]+\.[a-zA-Z]{2,}$/.test(email)) {
    throw new Error('ADMIN_EMAIL is missing or not a plain email address. Type it in again by hand.');
  }
  return email;
}

async function handle(request: Request) {
  // Only the database webhook knows this secret.
  if (request.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await request.json();
  if (payload.type !== 'INSERT' || payload.table !== 'reports') {
    return new Response('Ignored', { status: 200 });
  }
  const report = payload.record as Report;

  // The service role can read names and titles that the reporter's own access can't.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const ids = [report.reporter_id, report.reported_user_id].filter(Boolean) as string[];
  const [people, activity] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', ids),
    report.activity_id
      ? supabase.from('activities').select('title').eq('id', report.activity_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const nameOf = (id: string | null) =>
    people.data?.find((p) => p.id === id)?.display_name ?? 'Unknown';

  const reason = REASONS[report.reason] ?? report.reason;
  const lines = [
    `<p><strong>${escapeHtml(reason)}</strong></p>`,
    `<p>Reported by: ${escapeHtml(nameOf(report.reporter_id))}</p>`,
    report.reported_user_id
      ? `<p>About: ${escapeHtml(nameOf(report.reported_user_id))}</p>`
      : '',
    activity.data?.title ? `<p>Activity: ${escapeHtml(activity.data.title)}</p>` : '',
    report.details ? `<p>Details: "${escapeHtml(report.details)}"</p>` : '',
    `<p>Review it in the app: Profile → 🛡️ Moderation.</p>`,
  ];

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: "Who's Down <onboarding@resend.dev>",
      to: adminEmail(),
      subject: `New report: ${reason}`,
      html: lines.filter(Boolean).join('\n'),
    }),
  });

  if (!response.ok) {
    // Resend's reply explains the problem, e.g. a recipient it won't send to.
    const reason = await response.text();
    console.error('Resend error', response.status, reason);
    return new Response(`Email failed (Resend ${response.status}): ${reason}`, { status: 502 });
  }
  return new Response('Sent', { status: 200 });
}

// Reply with the error message on failure: the webhook stores replies in
// net._http_response, which makes problems visible from the SQL Editor.
Deno.serve(async (request) => {
  try {
    return await handle(request);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return new Response(`Error: ${message}`, { status: 500 });
  }
});
