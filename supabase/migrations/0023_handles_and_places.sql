-- Two gaps found in testing:
--  * "ig dylanisthegoat" got through: a plain word after "ig", "tg" or "tele" is a handle.
--  * "outside" was accepted as where an activity is: it needs a real, public place.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run 0022 first if you haven't.

-- Same as 0017, plus the "ig name" rule. Keep in step with src/lib/contact-details.ts.
create or replace function public.has_contact_details(content text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select content ~* any (array[
    -- @name, including email addresses
    '@[a-z0-9_.]{2,}',
    -- Links
    '\y(instagram\.com|t\.me|telegram\.me|wa\.me|tiktok\.com|snapchat\.com|discord\.gg|discord\.com|facebook\.com|fb\.com|twitter\.com|x\.com|spotify\.com|spotify\.link)\y',
    -- "ig: name", "tele - name", "snap id"
    '\y(ig|insta|instagram|snap|snapchat|telegram|tele|tg|tiktok|whatsapp|wa|discord|fb|facebook|twitter|spotify)\y\s*(:|=|@|-\s|id\y|handle\y)',
    -- "my ig is name"
    '\ymy\s+(ig|insta|instagram|snap|snapchat|telegram|tele|tg|tiktok|whatsapp|wa|discord|fb|facebook|twitter|spotify)\s+(is|at)\y',
    -- "dm me on ig", "add me on tele", "hit me up on snap"
    '\y(add|follow|dm|message|msg|text|find|contact|reach|ping|hmu|hit)\y(\s+me)?(\s+(up|on|at|via|in|through))*\s+(ig|insta|instagram|snap|snapchat|telegram|tele|tg|tiktok|whatsapp|wa|discord|fb|facebook|twitter|spotify)\y',
    -- "ig dylan_01": a platform, then something shaped like a handle
    '\y(ig|insta|instagram|snap|snapchat|telegram|tele|tg|tiktok|discord)\y\s+[a-z0-9_.]*[0-9_.][a-z0-9_.]*',
    -- "ig dylanisthegoat": "ig", "tg" and "tele" aren't everyday words, so any word after
    -- them is a handle
    '\y(ig|tg|tele)\y\s+[a-z][a-z0-9_.]{2,}',
    -- Camera or ghost emoji as a label: "📸: name"
    '(📸|👻)\s*:\s*[a-z0-9_.]{3,}',
    -- 8 or more digits
    '([+]?[0-9][ -]?){8,}'
  ]);
$$;

-- Someone's home ("my place", "your house"). The guidelines ask people to meet in public.
create function public.is_private_home(content text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select content ~* '\y(my|your|our|his|her|their)\s+(place|house|hse|home|room|bedroom|flat|apartment|apt|condo|crib|unit|hdb)\y';
$$;

-- What's wrong with where an activity is, or null if it's fine. "Outside" or "TBC" on its
-- own doesn't tell anyone where to go.
create function public.location_problem(location text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when location is null then null
    when public.is_private_home(location) then
      'For everyone''s safety, meet somewhere public, like a park, café, mall or sports hall. No homes.'
    when location ~* '^\s*(outside|outdoors|anywhere|anywhere\s+la|somewhere|wherever|everywhere|nowhere|around|nearby|near\s+me|here|there|online|tbc|tbd|tba|idk|later|secret|surprise|dm|dm\s+me|pm\s+me|ask\s+me|text\s+me|will\s+(update|share|tell)|see\s+chat|in\s+chat)\s*[.!?]*\s*$' then
      'Add a real place so people know where to go, like a park, mall, MRT station or café.'
  end;
$$;

-- Same as 0022, plus the place check.
create or replace function public.check_activity_text()
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
    public.location_problem(new.location),
    public.post_text_problem(new.location),
    public.post_text_problem(new.details)
  );
  if problem is not null then
    raise exception '%', problem;
  end if;
  return new;
end;
$$;

-- Ideas can be vague about where ("anywhere central" is fine), but not someone's home.
create or replace function public.check_idea_text()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  problem text := coalesce(
    public.post_text_problem(new.title),
    case when public.is_private_home(new.area) then
      'For everyone''s safety, meet somewhere public, like a park, café, mall or sports hall. No homes.'
    end,
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
