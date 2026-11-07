-- "I'd be down for…": loose ideas without a set time or place. People tap "I'm down too",
-- and anyone can turn an idea into a real activity with "Host it".
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Then redeploy the push function:
--   npx supabase@latest functions deploy push --no-verify-jwt

-- ---------------------------------------------------------------------------
-- Ideas
-- ---------------------------------------------------------------------------

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 80),
  category text not null
    check (category in ('sports', 'gym', 'gaming', 'food', 'outdoors', 'hangout')),
  -- All optional or "not sure": that's the point of an idea.
  area text check (char_length(area) <= 80),
  timing text not null default 'flexible'
    check (timing in ('flexible', 'weekday_evenings', 'weekends', 'this_week', 'next_week')),
  group_size text not null default 'not_sure'
    check (group_size in ('not_sure', 'small', 'medium', 'big')),
  note text check (char_length(note) <= 300),
  audience text not null default 'everyone' check (audience in ('everyone', 'guys', 'girls')),
  country text check (country ~ '^[A-Z]{2}$'),
  -- Set once someone hosts it as a real activity.
  activity_id uuid references public.activities (id) on delete set null,
  hosted_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);

create index ideas_country_expires on public.ideas (country, expires_at);

alter table public.ideas enable row level security;

-- Same rules as activities: your country, meant for you, nobody blocked or banned.
create policy "Signed-in users can view ideas"
  on public.ideas for select
  to authenticated
  using (
    user_id = auth.uid()
    or (
      country = public.my_country()
      and public.fits_my_audience(audience)
      and not public.is_blocked_between(user_id, auth.uid())
      and not public.is_banned(user_id)
    )
  );

create policy "Users can post their own ideas"
  on public.ideas for insert
  to authenticated
  with check (user_id = auth.uid() and not public.is_banned(auth.uid()) and activity_id is null);

create policy "Users can delete their own ideas"
  on public.ideas for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- No update policy: ideas are changed only by host_idea() below.

-- Country comes from the poster's profile; single-gender only for your own gender;
-- at most 3 open ideas each, so the feed doesn't fill up with one person's wishes.
create function public.before_idea_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select country into new.country from public.profiles where id = new.user_id;
  if new.country is null then
    raise exception 'Add your country to your profile before posting';
  end if;
  if public.fits_audience(new.audience, new.user_id) is not true then
    raise exception 'You can only make an idea just for your own gender';
  end if;
  if (
    select count(*) from public.ideas
    where user_id = new.user_id and activity_id is null and expires_at > now()
  ) >= 3 then
    raise exception 'You can have 3 ideas up at a time. Delete one or wait for it to be hosted.';
  end if;
  new.title := btrim(new.title);
  new.area := nullif(btrim(coalesce(new.area, '')), '');
  new.note := nullif(btrim(coalesce(new.note, '')), '');
  new.activity_id := null;
  new.hosted_at := null;
  new.created_at := now();
  new.expires_at := now() + interval '14 days';
  return new;
end;
$$;

create trigger before_idea_insert
  before insert on public.ideas
  for each row execute function public.before_idea_insert();

-- ---------------------------------------------------------------------------
-- "I'm down too"
-- ---------------------------------------------------------------------------

create table public.idea_interest (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

alter table public.idea_interest enable row level security;

-- You can see who's down for any idea you can see.
create policy "Users can see who is down"
  on public.idea_interest for select
  to authenticated
  using (exists (select 1 from public.ideas i where i.id = idea_id));

create policy "Users can say they're down"
  on public.idea_interest for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and not public.is_banned(auth.uid())
    and exists (select 1 from public.ideas i where i.id = idea_id)
  );

create policy "Users can change their mind"
  on public.idea_interest for delete
  to authenticated
  using (user_id = auth.uid());

create function public.check_idea_interest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.ideas%rowtype;
begin
  select * into target from public.ideas where id = new.idea_id;
  if not found then
    raise exception 'Idea not found';
  end if;
  if target.user_id = new.user_id then
    raise exception 'This is your idea, so you''re already down';
  end if;
  if target.activity_id is not null then
    raise exception 'Someone is already hosting this. Join the activity instead.';
  end if;
  if target.expires_at <= now() then
    raise exception 'This idea has ended';
  end if;
  if public.is_blocked_between(target.user_id, new.user_id) then
    raise exception 'You can''t join this idea';
  end if;
  if public.fits_audience(target.audience, new.user_id) is not true then
    raise exception 'This idea is for % only', target.audience;
  end if;
  return new;
end;
$$;

create trigger before_idea_interest
  before insert on public.idea_interest
  for each row execute function public.check_idea_interest();

-- Tells the person who posted it, and everyone once 3 people are keen.
create trigger push_on_idea_interest
  after insert on public.idea_interest
  for each row execute function public.notify_push('idea_interest');

-- ---------------------------------------------------------------------------
-- "Host it": link an idea to the activity you just posted for it
-- ---------------------------------------------------------------------------

create function public.host_idea(target_idea uuid, target_activity uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  idea public.ideas%rowtype;
  activity public.activities%rowtype;
begin
  select * into activity from public.activities where id = target_activity;
  if not found or activity.host_id is distinct from auth.uid() then
    raise exception 'You can only link an activity you host';
  end if;

  -- Lock it so two people can't host the same idea at once.
  select * into idea from public.ideas where id = target_idea for update;
  if not found then
    raise exception 'Idea not found';
  end if;
  if idea.activity_id is not null then
    raise exception 'Someone already hosted this idea';
  end if;
  if idea.country is distinct from activity.country
    or public.is_blocked_between(idea.user_id, auth.uid())
    or public.fits_audience(idea.audience, auth.uid()) is not true then
    raise exception 'You can''t host this idea';
  end if;

  update public.ideas
  set activity_id = target_activity, hosted_at = now()
  where id = target_idea;

  perform public.call_push_function(jsonb_build_object(
    'type', 'idea_hosted',
    'record', jsonb_build_object('idea_id', target_idea, 'activity_id', target_activity, 'host_id', auth.uid())
  ));
end;
$$;

revoke execute on function public.host_idea(uuid, uuid) from public, anon;
grant execute on function public.host_idea(uuid, uuid) to authenticated;
