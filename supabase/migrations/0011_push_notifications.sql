-- Push notifications: device tokens, on/off preference, triggers for new messages and
-- joins, and a timer for reminders. Notifications are sent by the "push" Edge Function.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run 0001 to 0010 first if you haven't.
--
-- Before running, add two secrets in Supabase -> Integrations -> Vault (names exactly):
--   project_url          https://<your-project-ref>.supabase.co
--   push_webhook_secret  any long random string (also set it as PUSH_WEBHOOK_SECRET on the
--                        push Edge Function, so it knows the request came from here)

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- Device tokens and preferences
-- ---------------------------------------------------------------------------

-- One row per phone. Only changed through the functions below.
create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;

-- Saves this phone's token for the signed-in user (taking it over if someone else
-- used to be signed in on the same phone).
create function public.register_push_token(device_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.push_tokens (token, user_id, updated_at)
  values (device_token, auth.uid(), now())
  on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
$$;

-- Removes this phone's token when signing out.
create function public.unregister_push_token(device_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens where token = device_token and user_id = auth.uid();
$$;

alter table public.profile_private
  add column notifications_enabled boolean not null default true,
  add column last_seen_at timestamptz;

-- Called when the app opens, for "haven't seen you in a while" reminders.
create function public.touch_last_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profile_private set last_seen_at = now() where id = auth.uid();
$$;

-- Which reminders have been sent, so each one only goes out once.
create table public.notification_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  ref text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, ref)
);

alter table public.notification_log enable row level security;

revoke execute on function public.register_push_token(text) from public, anon;
revoke execute on function public.unregister_push_token(text) from public, anon;
revoke execute on function public.touch_last_seen() from public, anon;
grant execute on function public.register_push_token(text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;
grant execute on function public.touch_last_seen() to authenticated;

-- ---------------------------------------------------------------------------
-- Calling the push Edge Function
-- ---------------------------------------------------------------------------

-- Posts to the push function with the shared secret from the Vault. Does nothing
-- until both Vault secrets exist, so it never blocks saving messages.
create function public.call_push_function(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  secret text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if base_url is null or secret is null then
    return;
  end if;

  perform net.http_post(
    url := rtrim(base_url, '/') || '/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', secret),
    body := payload,
    timeout_milliseconds := 5000
  );
end;
$$;

revoke execute on function public.call_push_function(jsonb) from public, anon, authenticated;

-- New group message, direct message, or someone joining: send the row to the function.
create function public.notify_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.call_push_function(jsonb_build_object('type', tg_argv[0], 'record', to_jsonb(new)));
  return new;
end;
$$;

create trigger push_on_message
  after insert on public.messages
  for each row execute function public.notify_push('message');

create trigger push_on_direct_message
  after insert on public.direct_messages
  for each row execute function public.notify_push('dm');

create trigger push_on_join
  after insert on public.activity_members
  for each row execute function public.notify_push('join');

-- Reminders ("starts in an hour", "check people in", "haven't seen you in a while")
-- are worked out by the function every 15 minutes.
select cron.schedule(
  'push-reminders',
  '*/15 * * * *',
  $$ select public.call_push_function('{"type": "reminders"}'::jsonb) $$
);
