-- Kudos: after a meetup, give people positive tags like "Friendly" or "On time".
-- Profiles show how many times each tag was given, not who gave it. There are no
-- negative tags: bad behaviour goes through Report.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table public.kudos (
  activity_id uuid not null references public.activities (id) on delete cascade,
  from_user uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  tag text not null check (tag in ('friendly', 'on_time', 'great_vibes', 'welcoming', 'funny', 'skilled')),
  created_at timestamptz not null default now(),
  primary key (activity_id, from_user, to_user, tag),
  check (from_user <> to_user)
);

create index kudos_to_user_idx on public.kudos (to_user);

alter table public.kudos enable row level security;

-- You only see the tags you gave, so you can change them.
create policy "Users can see the kudos they gave"
  on public.kudos for select
  to authenticated
  using (from_user = auth.uid());

-- Only to people who were at the same activity, from when it starts until 14 days later.
create policy "Participants can give kudos"
  on public.kudos for insert
  to authenticated
  with check (
    from_user = auth.uid()
    and public.is_participant(activity_id, from_user)
    and public.is_participant(activity_id, to_user)
    and exists (
      select 1 from public.activities a
      where a.id = activity_id
        and a.starts_at <= now()
        and a.starts_at > now() - interval '14 days'
    )
  );

create policy "Users can take kudos back"
  on public.kudos for delete
  to authenticated
  using (from_user = auth.uid());

-- How many times each tag has been given to someone, for their profile.
create function public.user_kudos(target_user uuid)
returns table (tag text, total integer)
language sql
stable
security definer
set search_path = ''
as $$
  select k.tag, count(*)::integer
  from public.kudos k
  where k.to_user = target_user
  group by k.tag
  order by count(*) desc, k.tag;
$$;

revoke execute on function public.user_kudos(uuid) from public, anon;
grant execute on function public.user_kudos(uuid) to authenticated;
