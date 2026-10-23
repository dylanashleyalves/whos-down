-- Same-country activities and the "I'm a guy" confirmation.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run 0001, 0002 and 0003 first if you haven't.

-- ---------------------------------------------------------------------------
-- Country (two-letter ISO code like 'SG', 'US', 'GB'), shown on profiles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column country text check (country ~ '^[A-Z]{2}$');

-- The signed-in user's country.
create function public.my_country()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select country from public.profiles where id = auth.uid();
$$;

revoke execute on function public.my_country() from public, anon;
grant execute on function public.my_country() to authenticated;

-- Each activity belongs to its host's country at the time it's posted.
alter table public.activities add column country text check (country ~ '^[A-Z]{2}$');

update public.activities a
set country = p.country
from public.profiles p
where p.id = a.host_id and a.country is null;

create function public.set_activity_country()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select country into new.country from public.profiles where id = new.host_id;
  if new.country is null then
    raise exception 'Add your country to your profile before posting';
  end if;
  return new;
end;
$$;

create trigger before_activity_insert_set_country
  before insert on public.activities
  for each row execute function public.set_activity_country();

-- Only show activities from your own country (and always your own posts).
drop policy "Signed-in users can view activities" on public.activities;
create policy "Signed-in users can view activities"
  on public.activities for select
  to authenticated
  using (
    host_id = auth.uid()
    or (country = public.my_country() and not public.is_blocked_between(host_id, auth.uid()))
  );

-- Only people in the same country can join.
create or replace function public.check_activity_join()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.activities%rowtype;
  joiner_country text;
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

  select country into joiner_country from public.profiles where id = new.user_id;
  if joiner_country is distinct from target.country then
    raise exception 'You can only join activities in your own country';
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

-- ---------------------------------------------------------------------------
-- "I'm a guy" confirmation (self-declared during setup)
-- ---------------------------------------------------------------------------

alter table public.profile_private add column confirmed_guy_at timestamptz;

-- New report reason for someone who isn't a guy.
alter table public.reports drop constraint reports_reason_check;
alter table public.reports add constraint reports_reason_check check (
  reason in ('harassment', 'inappropriate', 'spam', 'fake', 'underage', 'not_a_guy', 'unsafe', 'other')
);
