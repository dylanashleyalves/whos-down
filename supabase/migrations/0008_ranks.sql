-- Ranks: host check-in after activities, XP for real meetups, and friendship stats.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run 0001 to 0007 first if you haven't.
--
-- Only real meetups count: the host confirms who showed up, and an activity only
-- counts once at least 2 people besides the host attended.

-- ---------------------------------------------------------------------------
-- Check-in
-- ---------------------------------------------------------------------------

alter table public.activities add column checked_in_at timestamptz;

create table public.activity_attendance (
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  attended boolean not null,
  marked_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create index activity_attendance_user_id_idx on public.activity_attendance (user_id);

alter table public.activity_attendance enable row level security;

-- Only changed through host_check_in(); participants can see the result.
create policy "Participants can see attendance"
  on public.activity_attendance for select
  to authenticated
  using (public.is_participant(activity_id));

-- The host marks who showed up, any time from the start until 7 days later.
-- Members not in attended_ids are marked as no-shows.
create function public.host_check_in(target_activity uuid, attended_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.activities%rowtype;
begin
  select * into target from public.activities where id = target_activity;
  if not found or target.host_id <> auth.uid() then
    raise exception 'Only the host can check people in';
  end if;
  if target.starts_at > now() then
    raise exception 'You can check people in once the activity has started';
  end if;
  if target.starts_at < now() - interval '7 days' then
    raise exception 'Check-in closes 7 days after the activity';
  end if;

  insert into public.activity_attendance (activity_id, user_id, attended)
  select m.activity_id, m.user_id, m.user_id = any (attended_ids)
  from public.activity_members m
  where m.activity_id = target_activity
  on conflict (activity_id, user_id)
  do update set attended = excluded.attended, marked_at = now();

  update public.activities set checked_in_at = now() where id = target_activity;
end;
$$;

-- ---------------------------------------------------------------------------
-- Who was at each activity that counts (host + members marked as attended)
-- ---------------------------------------------------------------------------

create function public.counted_attendance()
returns table (activity_id uuid, user_id uuid, starts_at timestamptz, is_host boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with counted as (
    select a.id, a.host_id, a.starts_at
    from public.activities a
    where a.checked_in_at is not null
      and (select count(*) from public.activity_attendance t
           where t.activity_id = a.id and t.attended) >= 2
  )
  select c.id, c.host_id, c.starts_at, true from counted c
  union all
  select c.id, t.user_id, c.starts_at, false
  from counted c
  join public.activity_attendance t on t.activity_id = c.id and t.attended;
$$;

-- ---------------------------------------------------------------------------
-- XP
--   host an activity that counts      +20
--   attend one                        +10
--   each person there you'd never met  +5
--   each person there you'd met before +10  (keeping friendships going)
--   mutual "hang again"               +15
--   no-show                           -15
-- Ranks use XP from the last 90 days, so they slowly drop if you stop going out.
-- ---------------------------------------------------------------------------

create function public.user_xp(user_ids uuid[])
returns table (user_id uuid, xp_recent integer, xp_total integer)
language sql
stable
security definer
set search_path = ''
as $$
  with att as (
    select * from public.counted_attendance() c where c.user_id = any (user_ids)
  ),
  everyone as (
    select * from public.counted_attendance()
  ),
  pairs as (
    -- Each other person at each counted activity, and whether it was the first time together.
    select a.user_id, a.starts_at,
           row_number() over (partition by a.user_id, o.user_id order by a.starts_at, a.activity_id) as nth
    from att a
    join everyone o on o.activity_id = a.activity_id and o.user_id <> a.user_id
  ),
  events as (
    select user_id, starts_at as at, case when is_host then 20 else 10 end as xp from att
    union all
    select user_id, starts_at, case when nth = 1 then 5 else 10 end from pairs
    union all
    select h.from_user, greatest(h.created_at, back.created_at), 15
    from public.hang_again h
    join public.hang_again back on back.from_user = h.to_user and back.to_user = h.from_user
    where h.from_user = any (user_ids)
    union all
    select t.user_id, a.starts_at, -15
    from public.activity_attendance t
    join public.activities a on a.id = t.activity_id
    where not t.attended and t.user_id = any (user_ids)
  )
  select u.id,
         greatest(coalesce(sum(e.xp) filter (where e.at > now() - interval '90 days'), 0), 0)::integer,
         greatest(coalesce(sum(e.xp), 0), 0)::integer
  from unnest(user_ids) as u(id)
  left join events e on e.user_id = u.id
  group by u.id;
$$;

-- Stats for one person's profile: XP, meetups, people met, and their weekly streak.
create function public.user_stats(target uuid)
returns table (
  xp_recent integer,
  xp_total integer,
  meetups integer,
  people_met integer,
  streak_weeks integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  week date;
  expected date := date_trunc('week', now())::date;
  streak integer := 0;
begin
  -- Weeks in a row with at least one meetup, ending this week (or last week, so
  -- the streak doesn't vanish on Monday morning).
  for week in
    select distinct date_trunc('week', c.starts_at)::date as w
    from public.counted_attendance() c
    where c.user_id = target
    order by w desc
  loop
    if streak = 0 and week = expected - 7 then
      expected := week;
    end if;
    exit when week <> expected;
    streak := streak + 1;
    expected := expected - 7;
  end loop;

  return query
  select x.xp_recent, x.xp_total,
         (select count(distinct c.activity_id)::integer
            from public.counted_attendance() c where c.user_id = target),
         (select count(distinct o.user_id)::integer
            from public.counted_attendance() c
            join public.counted_attendance() o on o.activity_id = c.activity_id and o.user_id <> c.user_id
            where c.user_id = target),
         streak
  from public.user_xp(array[target]) x;
end;
$$;

-- Your crew with how often and how recently you've met up (for friendship levels).
create function public.crew_friendships()
returns table (friend_id uuid, times_together integer, last_together timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with crew as (
    select p.id from public.my_connections() p
  ),
  together as (
    select o.user_id as friend_id, c.starts_at
    from public.counted_attendance() c
    join public.counted_attendance() o on o.activity_id = c.activity_id
    where c.user_id = auth.uid() and o.user_id in (select id from crew)
  )
  select crew.id, count(t.starts_at)::integer, max(t.starts_at)
  from crew
  left join together t on t.friend_id = crew.id
  group by crew.id;
$$;

revoke execute on function public.host_check_in(uuid, uuid[]) from public, anon;
revoke execute on function public.counted_attendance() from public, anon, authenticated;
revoke execute on function public.user_xp(uuid[]) from public, anon;
revoke execute on function public.user_stats(uuid) from public, anon;
revoke execute on function public.crew_friendships() from public, anon;
grant execute on function public.host_check_in(uuid, uuid[]) to authenticated;
grant execute on function public.user_xp(uuid[]) to authenticated;
grant execute on function public.user_stats(uuid) to authenticated;
grant execute on function public.crew_friendships() to authenticated;
