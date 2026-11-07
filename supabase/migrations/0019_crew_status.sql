-- Crew status alerts, and "Busy today" set automatically while you're at an activity.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Then redeploy the push function:
--   npx supabase@latest functions deploy push --no-verify-jwt

-- ---------------------------------------------------------------------------
-- "Ryan is free now": tell your crew when you're free
-- ---------------------------------------------------------------------------

alter table public.profile_private
  add column notify_crew_status boolean not null default true;  -- someone in your crew is free

-- Picking Free now or Free tonight (or picking it again after it ran out) sends the row
-- to the push function, which sends at most one of these a day from each person.
create trigger push_on_status
  after update of status on public.profiles
  for each row
  when (
    new.status in ('free_now', 'free_tonight')
    and (
      new.status is distinct from old.status
      or old.status_until is null
      or old.status_until <= now()
    )
  )
  execute function public.notify_push('status');

-- ---------------------------------------------------------------------------
-- "Busy today" while you're at an activity
-- ---------------------------------------------------------------------------

-- When an activity that someone joined starts, everyone going is marked "Busy today"
-- until midnight Singapore time, which also holds new-activity alerts. It happens once
-- per activity, so if nobody turns up you can change your status and it stays.
create function public.mark_busy_at_activities()
returns void
language sql
security definer
set search_path = ''
as $$
  with started as (
    select a.id, a.host_id
    from public.activities a
    where a.starts_at <= now()
      and a.starts_at > now() - interval '1 hour'
      and exists (select 1 from public.activity_members m where m.activity_id = a.id)
  ),
  going as (
    select s.id as activity_id, s.host_id as user_id from started s
    union
    select m.activity_id, m.user_id
    from public.activity_members m
    join started s on s.id = m.activity_id
  ),
  first_time as (
    insert into public.notification_log (user_id, kind, ref)
    select user_id, 'auto_busy', activity_id::text from going
    on conflict do nothing
    returning user_id
  )
  update public.profiles p
  set
    status = 'busy',
    status_until =
      (date_trunc('day', now() at time zone 'Asia/Singapore') + interval '1 day')
        at time zone 'Asia/Singapore' - interval '1 millisecond'
  where p.id in (select user_id from first_time);
$$;

revoke execute on function public.mark_busy_at_activities() from public, anon, authenticated;

select cron.schedule(
  'busy-at-activities',
  '*/15 * * * *',
  $$ select public.mark_busy_at_activities() $$
);
