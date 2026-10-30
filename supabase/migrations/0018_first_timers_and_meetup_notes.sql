-- Two things that make a first meetup less daunting: a badge for people on their first one,
-- and a "how to find us" note that only people going can see.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------------------
-- First-timers
-- ---------------------------------------------------------------------------

-- Which of these people haven't been to a meetup yet. Hosting counts once someone else came,
-- and joining counts unless the host marked you as a no-show.
create function public.first_timers(user_ids uuid[])
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from unnest(user_ids) as u(id)
  where not exists (
    select 1
    from public.activities a
    join public.activity_members m on m.activity_id = a.id
    where a.starts_at <= now()
      and (a.host_id = u.id or m.user_id = u.id)
      and not exists (
        select 1 from public.activity_attendance t
        where t.activity_id = a.id and t.user_id = m.user_id and not t.attended
      )
  );
$$;

revoke execute on function public.first_timers(uuid[]) from public, anon;
grant execute on function public.first_timers(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- How to find us
-- ---------------------------------------------------------------------------

-- Its own table because activities are visible to everyone in the country, and a note can
-- say what someone's wearing.
create table public.activity_meetup_notes (
  activity_id uuid primary key references public.activities (id) on delete cascade,
  note text not null check (char_length(note) between 1 and 120)
);

alter table public.activity_meetup_notes enable row level security;

create policy "Participants can see the meetup note"
  on public.activity_meetup_notes for select
  to authenticated
  using (public.is_participant(activity_id));

create policy "Hosts can add a meetup note"
  on public.activity_meetup_notes for insert
  to authenticated
  with check (
    exists (select 1 from public.activities a where a.id = activity_id and a.host_id = auth.uid())
  );

create policy "Hosts can change their meetup note"
  on public.activity_meetup_notes for update
  to authenticated
  using (
    exists (select 1 from public.activities a where a.id = activity_id and a.host_id = auth.uid())
  )
  with check (
    exists (select 1 from public.activities a where a.id = activity_id and a.host_id = auth.uid())
  );

create policy "Hosts can remove their meetup note"
  on public.activity_meetup_notes for delete
  to authenticated
  using (
    exists (select 1 from public.activities a where a.id = activity_id and a.host_id = auth.uid())
  );
