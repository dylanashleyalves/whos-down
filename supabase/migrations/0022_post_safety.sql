-- Keeping posts clean: a filter on what people write, reporting ideas, and hiding an idea
-- once 3 different people report it, until an admin looks at it.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run 0021 first if you haven't.

-- ---------------------------------------------------------------------------
-- 1. The filter
-- ---------------------------------------------------------------------------

-- True if text has words that break the community guidelines: sexual or hook-up
-- wording, drugs and vapes (both illegal in Singapore), slurs, or selling and recruiting.
-- Whole words only, so "Essex" or "cocktail" are fine. Add to the list as cases come up.
create function public.has_blocked_words(content text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select content ~* any (array[
    -- Sexual and hook-up
    '\y(sex|s3x|sexy|horny|nude|nudes|naked|porn|xxx|nsfw|onlyfans|fwb|hookup|hookups|threesome|fetish|kinky|bdsm|erotic|sensual|escort|escorts|nuru)\y',
    '\y(hook\s*up|one\s*night\s*stand|friends?\s+with\s+benefits|no\s+strings\s+attached|sugar\s*(daddy|baby|mommy|mummy)|happy\s+ending|body\s*to\s*body)\y',
    -- Drugs and vapes
    '\y(weed|ganja|marijuana|cannabis|cocaine|mdma|ecstasy|ketamine|meth|lsd|shrooms|vape|vapes|vaping|ecig|e-cig|juul|kpod|kpods|drugs)\y',
    '\y(magic\s+mushrooms?|get\s+high|getting\s+high)\y',
    -- Slurs
    '\y(nigger|niggers|nigga|niggas|fag|fags|faggot|faggots|tranny|trannies|retard|retards|chink|chinks|keling|paki|pakis)\y',
    -- Selling, scams and recruiting
    '\y(crypto|forex|mlm|bitcoin)\y',
    '\y(passive\s+income|side\s+income|make\s+money|earn\s+money|earn\s+\$|investment\s+opportunit(y|ies)|financial\s+(advisor|adviser|planner|planning)|business\s+opportunit(y|ies))\y'
  ]);
$$;

-- The message people see, or null if the text is fine.
create function public.post_text_problem(content text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when content is null or btrim(content) = '' then null
    when public.has_contact_details(content) then
      'Keep phone numbers, handles and links out of posts. You can chat in the app once people join.'
    when public.has_blocked_words(content) then
      'This looks like it breaks the community guidelines (no sexual content, drugs or vapes, hate, or selling). Please reword it.'
  end;
$$;

-- Ideas: the title, area and note.
create function public.check_idea_text()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  problem text := coalesce(
    public.post_text_problem(new.title),
    public.post_text_problem(new.area),
    public.post_text_problem(new.note)
  );
begin
  if problem is not null then
    raise exception '%', problem;
  end if;
  return new;
end;
$$;

create trigger before_idea_check_text
  before insert on public.ideas
  for each row execute function public.check_idea_text();

-- Activities: the title, place and details. Only when they change, so older posts don't
-- stop check-ins or other updates.
create function public.check_activity_text()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  problem text;
begin
  if tg_op = 'UPDATE'
    and new.title is not distinct from old.title
    and new.location is not distinct from old.location
    and new.details is not distinct from old.details then
    return new;
  end if;
  problem := coalesce(
    public.post_text_problem(new.title),
    public.post_text_problem(new.location),
    public.post_text_problem(new.details)
  );
  if problem is not null then
    raise exception '%', problem;
  end if;
  return new;
end;
$$;

create trigger before_activity_check_text
  before insert or update of title, location, details on public.activities
  for each row execute function public.check_activity_text();

-- Bios already keep out contact details (0016); keep out the rest too.
create function public.check_bio_words()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.bio is not distinct from old.bio then
    return new;
  end if;
  if new.bio is not null and public.has_blocked_words(new.bio) then
    raise exception 'Your bio looks like it breaks the community guidelines. Please reword it.';
  end if;
  return new;
end;
$$;

create trigger before_profile_check_bio_words
  before insert or update of bio on public.profiles
  for each row execute function public.check_bio_words();

-- ---------------------------------------------------------------------------
-- 2. Reporting an idea, and hiding it after 3 reports
-- ---------------------------------------------------------------------------

alter table public.ideas add column hidden_at timestamptz;

alter table public.reports
  add column idea_id uuid references public.ideas (id) on delete set null,
  -- What the idea said when it was reported, so it can still be reviewed after it's deleted.
  add column idea_text text;

-- One report per person per idea, so nobody can hide an idea on their own.
create unique index reports_one_per_idea on public.reports (reporter_id, idea_id)
  where idea_id is not null;

-- Fills in who posted the idea and what it said.
create function public.before_report_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  idea public.ideas%rowtype;
begin
  if new.idea_id is not null then
    select * into idea from public.ideas where id = new.idea_id;
    if not found then
      raise exception 'Idea not found';
    end if;
    new.reported_user_id := idea.user_id;
    new.idea_text := concat_ws(' · ', idea.title, idea.area, idea.note);
  end if;
  return new;
end;
$$;

create trigger before_report_insert
  before insert on public.reports
  for each row execute function public.before_report_insert();

-- Once 3 different people have open reports about an idea, it's hidden from everyone
-- (apart from whoever posted it, and admins) until an admin restores or deletes it.
create function public.hide_reported_idea()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.idea_id is not null and (
    select count(distinct reporter_id) from public.reports
    where idea_id = new.idea_id and status = 'open'
  ) >= 3 then
    update public.ideas set hidden_at = now() where id = new.idea_id and hidden_at is null;
  end if;
  return new;
end;
$$;

create trigger after_report_hide_idea
  after insert on public.reports
  for each row execute function public.hide_reported_idea();

-- Hidden ideas disappear for everyone else; admins can still see them to review.
drop policy "Signed-in users can view ideas" on public.ideas;
create policy "Signed-in users can view ideas"
  on public.ideas for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      hidden_at is null
      and country = public.my_country()
      and public.fits_my_audience(audience)
      and not public.is_blocked_between(user_id, auth.uid())
      and not public.is_banned(user_id)
    )
  );

-- Nobody can join or host a hidden idea.
create or replace function public.check_idea_interest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.ideas%rowtype;
begin
  select * into target from public.ideas where id = new.idea_id;
  if not found or target.hidden_at is not null then
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

create or replace function public.host_idea(target_idea uuid, target_activity uuid)
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
  if not found or idea.hidden_at is not null then
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

-- ---------------------------------------------------------------------------
-- 3. Moderation
-- ---------------------------------------------------------------------------

-- Same as before (0006), plus the reported idea.
drop function public.admin_reports();
create function public.admin_reports()
returns table (
  id uuid,
  reason text,
  details text,
  status text,
  created_at timestamptz,
  reporter_id uuid,
  reporter_name text,
  reported_user_id uuid,
  reported_user_name text,
  activity_id uuid,
  activity_title text,
  activity_host_id uuid,
  activity_host_name text,
  -- Whether the person a moderator would act on (reported user, or the host) is banned.
  target_banned boolean,
  idea_id uuid,
  idea_text text,
  idea_hidden boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  return query
  select
    r.id, r.reason, r.details, r.status, r.created_at,
    r.reporter_id, reporter.display_name,
    r.reported_user_id, reported.display_name,
    r.activity_id, a.title, a.host_id, host.display_name,
    public.is_banned(coalesce(r.reported_user_id, a.host_id)),
    r.idea_id, r.idea_text, i.hidden_at is not null
  from public.reports r
  left join public.profiles reporter on reporter.id = r.reporter_id
  left join public.profiles reported on reported.id = r.reported_user_id
  left join public.activities a on a.id = r.activity_id
  left join public.profiles host on host.id = a.host_id
  left join public.ideas i on i.id = r.idea_id
  order by (r.status = 'open') desc, r.created_at desc
  limit 200;
end;
$$;

revoke execute on function public.admin_reports() from public, anon;
grant execute on function public.admin_reports() to authenticated;

-- Deletes an idea and closes every open report about it.
create function public.admin_delete_idea(target_idea uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  update public.reports set status = 'actioned' where status = 'open' and idea_id = target_idea;
  delete from public.ideas where id = target_idea;
end;
$$;

-- The reports were wrong: show the idea again and mark its reports reviewed.
create function public.admin_restore_idea(target_idea uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  update public.reports set status = 'reviewed' where status = 'open' and idea_id = target_idea;
  update public.ideas set hidden_at = null where id = target_idea;
end;
$$;

revoke execute on function public.admin_delete_idea(uuid) from public, anon;
revoke execute on function public.admin_restore_idea(uuid) from public, anon;
grant execute on function public.admin_delete_idea(uuid) to authenticated;
grant execute on function public.admin_restore_idea(uuid) to authenticated;
