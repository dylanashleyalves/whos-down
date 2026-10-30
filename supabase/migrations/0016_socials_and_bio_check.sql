-- Socials only your crew can see, and a check that keeps contact details out of bios.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------------------
-- Socials
-- ---------------------------------------------------------------------------

create table public.profile_socials (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  instagram text check (instagram ~ '^[a-z0-9._]{1,30}$'),
  telegram text check (telegram ~ '^[a-z0-9_]{5,32}$')
);

alter table public.profile_socials enable row level security;

-- Only you and your crew (met, both tapped "Hang again?", no block) can read them.
create policy "Users and their crew can see socials"
  on public.profile_socials for select
  to authenticated
  using (user_id = auth.uid() or public.is_crew(auth.uid(), user_id));

create policy "Users can add their socials"
  on public.profile_socials for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can change their socials"
  on public.profile_socials for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can remove their socials"
  on public.profile_socials for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- No contact details in bios
-- ---------------------------------------------------------------------------

-- True if text looks like it has a social handle, a link to one, or a phone number.
-- Keep in step with CONTACT_PATTERNS in src/lib/contact-details.ts.
create function public.has_contact_details(content text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select content ~* any (array[
    -- @name, including email addresses
    '@[a-z0-9_.]{2,}',
    -- Links
    '\y(instagram\.com|t\.me|telegram\.me|wa\.me|tiktok\.com|snapchat\.com|discord\.gg|discord\.com|facebook\.com|fb\.com|twitter\.com|x\.com)\y',
    -- "ig: name", "tele - name", "snap id"
    '\y(ig|insta|instagram|snap|snapchat|telegram|tele|tg|tiktok|whatsapp|wa|discord|fb|facebook|twitter)\y\s*(:|=|@|-\s|id\y|handle\y)',
    -- "my ig is name"
    '\ymy\s+(ig|insta|instagram|snap|snapchat|telegram|tele|tg|tiktok|whatsapp|wa|discord|fb|facebook|twitter)\s+(is|at)\y',
    -- "dm me on ig", "add me on tele", "hit me up on snap"
    '\y(add|follow|dm|message|msg|text|find|contact|reach|ping|hmu|hit)\y(\s+me)?(\s+(up|on|at|via|in|through))*\s+(ig|insta|instagram|snap|snapchat|telegram|tele|tg|tiktok|whatsapp|wa|discord|fb|facebook|twitter)\y',
    -- "ig dylan_01": a platform, then something shaped like a handle
    '\y(ig|insta|instagram|snap|snapchat|telegram|tele|tg|tiktok|discord)\y\s+[a-z0-9_.]*[0-9_.][a-z0-9_.]*',
    -- Camera or ghost emoji as a label: "📸: name"
    '(📸|👻)\s*:\s*[a-z0-9_.]{3,}',
    -- 8 or more digits
    '([+]?[0-9][ -]?){8,}'
  ]);
$$;

create function public.check_bio_contact_details()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Only when the bio changes, so older bios don't stop other profile changes.
  if tg_op = 'UPDATE' and new.bio is not distinct from old.bio then
    return new;
  end if;
  if new.bio is not null and public.has_contact_details(new.bio) then
    raise exception 'Keep handles, links and phone numbers out of your bio. Add socials below: only your crew can see them.';
  end if;
  return new;
end;
$$;

create trigger before_profile_check_bio
  before insert or update of bio on public.profiles
  for each row execute function public.check_bio_contact_details();
