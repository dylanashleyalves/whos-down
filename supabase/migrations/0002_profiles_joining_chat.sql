-- Profiles, joining activities, group chat and "hang again".
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run 0001_activities.sql first if you haven't.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 2 and 40),
  city text check (char_length(city) <= 60),
  bio text check (char_length(bio) <= 200),
  interests text[] not null default '{}',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Signed-in users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Every new user gets an empty profile; the app asks them to fill it in.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users who signed up before this migration.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Point activity hosts at profiles so the app can show who posted.
alter table public.activities drop constraint activities_host_id_fkey;
alter table public.activities
  add constraint activities_host_id_fkey
  foreign key (host_id) references public.profiles (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Joining activities
-- ---------------------------------------------------------------------------

create table public.activity_members (
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create index activity_members_user_id_idx on public.activity_members (user_id);

alter table public.activity_members enable row level security;

create policy "Signed-in users can see who's going"
  on public.activity_members for select
  to authenticated
  using (true);

create policy "Users can join activities"
  on public.activity_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can leave activities"
  on public.activity_members for delete
  to authenticated
  using (user_id = auth.uid());

-- Block joining your own activity, one that already started, or one that's full.
create function public.check_activity_join()
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

create trigger before_activity_join
  before insert on public.activity_members
  for each row execute function public.check_activity_join();

-- True if the user is hosting or has joined the activity.
create function public.is_participant(target_activity uuid, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.activities
    where id = target_activity and host_id = target_user
  ) or exists (
    select 1 from public.activity_members
    where activity_id = target_activity and user_id = target_user
  );
$$;

-- ---------------------------------------------------------------------------
-- Group chat (one per activity, only for people who are going)
-- ---------------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index messages_activity_id_created_at_idx on public.messages (activity_id, created_at);

alter table public.messages enable row level security;

create policy "Participants can read the chat"
  on public.messages for select
  to authenticated
  using (public.is_participant(activity_id));

create policy "Participants can send messages"
  on public.messages for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_participant(activity_id));

-- Send new messages to the app live.
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------------
-- "Want to hang again?" -- private until both people say yes
-- ---------------------------------------------------------------------------

-- True if both users took part in the same activity that has already started.
create function public.were_together(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.activities act
    where act.starts_at < now()
      and public.is_participant(act.id, a)
      and public.is_participant(act.id, b)
  );
$$;

create table public.hang_again (
  from_user uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user),
  check (from_user <> to_user)
);

alter table public.hang_again enable row level security;

-- You only ever see your own choices, so nobody learns who said no.
create policy "Users can see their own choices"
  on public.hang_again for select
  to authenticated
  using (from_user = auth.uid());

create policy "Users can say they'd hang again"
  on public.hang_again for insert
  to authenticated
  with check (from_user = auth.uid() and public.were_together(from_user, to_user));

create policy "Users can take it back"
  on public.hang_again for delete
  to authenticated
  using (from_user = auth.uid());

-- People where both sides said yes: your crew.
create function public.my_connections()
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
  );
$$;

-- Helper functions are for signed-in users only.
revoke execute on function public.is_participant(uuid, uuid) from public, anon;
revoke execute on function public.were_together(uuid, uuid) from public, anon;
revoke execute on function public.my_connections() from public, anon;
grant execute on function public.is_participant(uuid, uuid) to authenticated;
grant execute on function public.were_together(uuid, uuid) to authenticated;
grant execute on function public.my_connections() to authenticated;

-- ---------------------------------------------------------------------------
-- Profile photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Each user uploads into a folder named after their user id.
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
