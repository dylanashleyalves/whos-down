-- How long an idea stays up now follows its timing, instead of a flat 14 days:
--   This week         until Sunday night (at least 2 days, if posted at the weekend)
--   Next week         until the Sunday night after next week
--   Weekends          for two weekends: until the Sunday night after next
--   Weekday evenings  until Friday night next week
--   Flexible          14 days
-- Never longer than 14 days. Hosting an idea still takes it down straight away.
-- Times are Singapore time (UTC+8), where the app is launching.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create function public.idea_expiry(timing text, posted timestamptz)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  with local as (
    select (posted at time zone 'Asia/Singapore') as at,
           -- Midnight at the start of next Monday, Singapore time.
           date_trunc('week', posted at time zone 'Asia/Singapore') + interval '7 days' as next_monday
  )
  select least(
    case timing
      when 'this_week' then greatest(next_monday, at + interval '2 days')
      when 'next_week' then next_monday + interval '7 days'
      when 'weekends' then next_monday + interval '7 days'
      when 'weekday_evenings' then next_monday + interval '5 days'
      else at + interval '14 days'
    end,
    at + interval '14 days'
  ) at time zone 'Asia/Singapore'
  from local;
$$;

-- Same as 0021, apart from expires_at.
create or replace function public.before_idea_insert()
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
  new.expires_at := public.idea_expiry(new.timing, new.created_at);
  return new;
end;
$$;

-- Bring ideas that are already up in line (only ever shortens them).
update public.ideas
set expires_at = least(expires_at, public.idea_expiry(timing, created_at))
where activity_id is null and expires_at > now();
