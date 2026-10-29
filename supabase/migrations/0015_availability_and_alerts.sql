-- Availability (a quick status plus usual free times) and two new notifications:
-- new activities that match your interests, and kudos you've been given.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Then redeploy the push function:
--   npx supabase@latest functions deploy push --no-verify-jwt

-- ---------------------------------------------------------------------------
-- Availability, shown on profiles
-- ---------------------------------------------------------------------------

alter table public.profiles
  -- A quick status that runs out on its own at status_until.
  add column status text check (status in ('free_now', 'busy', 'free_tonight', 'free_weekend')),
  add column status_until timestamptz,
  -- When you're usually free.
  add column free_times text[] not null default '{}'
    check (free_times <@ array['weekday_daytime', 'weekday_evenings', 'weekend_daytime', 'weekend_evenings']);

-- ---------------------------------------------------------------------------
-- New notification types (Settings switches, like those in 0013)
-- ---------------------------------------------------------------------------

alter table public.profile_private
  add column notify_activities boolean not null default true,  -- new posts matching your interests
  add column notify_kudos boolean not null default true;       -- someone gave you kudos

create trigger push_on_activity
  after insert on public.activities
  for each row execute function public.notify_push('activity');

create trigger push_on_kudos
  after insert on public.kudos
  for each row execute function public.notify_push('kudos');
