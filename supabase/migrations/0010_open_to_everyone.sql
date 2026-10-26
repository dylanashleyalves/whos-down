-- Open Who's Down to everyone: people say whether they're a guy or a girl (or neither),
-- and hosts choose who each activity is for: everyone, guys only, or girls only.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run 0001 to 0009 first if you haven't.

-- ---------------------------------------------------------------------------
-- Gender: private, self-declared during setup
-- ---------------------------------------------------------------------------

alter table public.profile_private
  add column gender text check (gender in ('guy', 'girl', 'unspecified'));

-- Everyone who confirmed "I'm a guy" before this change is a guy.
update public.profile_private set gender = 'guy'
where confirmed_guy_at is not null and gender is null;

-- The signed-in user's gender (private, so only used inside these rules).
create function public.my_gender()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select gender from public.profile_private where id = auth.uid();
$$;

create function public.gender_of(target uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select gender from public.profile_private where id = target;
$$;

revoke execute on function public.my_gender() from public, anon;
revoke execute on function public.gender_of(uuid) from public, anon, authenticated;
grant execute on function public.my_gender() to authenticated;

-- ---------------------------------------------------------------------------
-- Who each activity is for
-- ---------------------------------------------------------------------------

alter table public.activities
  add column audience text not null default 'everyone'
  check (audience in ('everyone', 'guys', 'girls'));

-- True if this person is allowed to see and join an activity for this audience.
create function public.fits_audience(target_audience text, person uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_audience = 'everyone'
    or (target_audience = 'guys' and public.gender_of(person) = 'guy')
    or (target_audience = 'girls' and public.gender_of(person) = 'girl');
$$;

-- Internal only: called with any person, so it must not be callable from the app
-- (that would let people look up someone else's gender).
revoke execute on function public.fits_audience(text, uuid) from public, anon, authenticated;

-- The app-facing version only ever checks the signed-in user.
create function public.fits_my_audience(target_audience text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.fits_audience(target_audience, auth.uid());
$$;

revoke execute on function public.fits_my_audience(text) from public, anon;
grant execute on function public.fits_my_audience(text) to authenticated;

-- Hosts can only make an activity single-gender for their own gender.
create function public.check_activity_audience()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.fits_audience(new.audience, new.host_id) then
    raise exception 'You can only make an activity just for your own gender';
  end if;
  return new;
end;
$$;

create trigger before_activity_saved_check_audience
  before insert or update of audience on public.activities
  for each row execute function public.check_activity_audience();

-- Only show activities meant for you (and always ones you host or joined).
drop policy "Signed-in users can view activities" on public.activities;
create policy "Signed-in users can view activities"
  on public.activities for select
  to authenticated
  using (
    host_id = auth.uid()
    or public.is_participant(id)
    or (
      country = public.my_country()
      and public.fits_my_audience(audience)
      and not public.is_blocked_between(host_id, auth.uid())
      and not public.is_banned(host_id)
    )
  );

-- Joining: same checks as before, plus the activity has to be meant for you.
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

  if not public.fits_audience(target.audience, new.user_id) then
    raise exception 'This activity is for % only', target.audience;
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
