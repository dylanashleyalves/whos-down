-- Safety: 18+ check, community guidelines, blocking and reporting.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run 0001 and 0002 first if you haven't.

-- ---------------------------------------------------------------------------
-- Private profile details: birthday and guidelines agreement (only you see them)
-- ---------------------------------------------------------------------------

create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  birthdate date not null check (birthdate > date '1900-01-01'),
  accepted_guidelines_at timestamptz not null default now()
);

alter table public.profile_private enable row level security;

create policy "Users can see their own private details"
  on public.profile_private for select
  to authenticated
  using (id = auth.uid());

create policy "Users can add their own private details"
  on public.profile_private for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update their own private details"
  on public.profile_private for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Everyone must be 18 or older.
create function public.check_adult()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birthdate > (current_date - interval '18 years')::date then
    raise exception 'You must be 18 or older to use Who''s Down';
  end if;
  return new;
end;
$$;

create trigger before_profile_private_saved
  before insert or update on public.profile_private
  for each row execute function public.check_adult();

-- ---------------------------------------------------------------------------
-- Blocking: blocked people can't see each other's activities or messages
-- ---------------------------------------------------------------------------

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "Users can see who they blocked"
  on public.blocks for select
  to authenticated
  using (blocker_id = auth.uid());

create policy "Users can block people"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy "Users can unblock people"
  on public.blocks for delete
  to authenticated
  using (blocker_id = auth.uid());

-- True if either person blocked the other.
create function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

-- Hide activities hosted by someone you blocked, or who blocked you.
drop policy "Signed-in users can view activities" on public.activities;
create policy "Signed-in users can view activities"
  on public.activities for select
  to authenticated
  using (not public.is_blocked_between(host_id, auth.uid()));

-- Hide chat messages between blocked people.
drop policy "Participants can read the chat" on public.messages;
create policy "Participants can read the chat"
  on public.messages for select
  to authenticated
  using (public.is_participant(activity_id) and not public.is_blocked_between(user_id, auth.uid()));

-- Also stop blocked people joining each other's activities.
create or replace function public.check_activity_join()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.activities%rowtype;
  taken integer;
begin
  -- Lock the activity so two people can't grab the last spot at once.
  select * into target from public.activities where id = new.activity_id for update;
  if not found then
    raise exception 'Activity not found';
  end if;
  if target.host_id = new.user_id then
    raise exception 'You''re hosting this activity';
  end if;
  if public.is_blocked_between(target.host_id, new.user_id) then
    raise exception 'You can''t join this activity';
  end if;
  if target.starts_at < now() then
    raise exception 'This activity has already started';
  end if;

  select count(*) into taken from public.activity_members where activity_id = new.activity_id;
  if taken >= target.spots then
    raise exception 'This activity is full';
  end if;

  return new;
end;
$$;

-- Blocked people drop out of your crew.
create or replace function public.my_connections()
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select p.* from public.profiles p
  where exists (
    select 1 from public.hang_again h where h.from_user = auth.uid() and h.to_user = p.id
  ) and exists (
    select 1 from public.hang_again h where h.from_user = p.id and h.to_user = auth.uid()
  ) and not public.is_blocked_between(p.id, auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Reports: review them in Supabase -> Table Editor -> reports
-- ---------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete set null,
  activity_id uuid references public.activities (id) on delete set null,
  reason text not null check (
    reason in ('harassment', 'inappropriate', 'spam', 'fake', 'underage', 'unsafe', 'other')
  ),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'actioned')),
  created_at timestamptz not null default now(),
  check (reported_user_id is not null or activity_id is not null)
);

alter table public.reports enable row level security;

create policy "Users can send reports"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "Users can see their own reports"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid());
