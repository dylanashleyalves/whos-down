-- TikTok and Spotify as crew-only socials, and the bio check learns about Spotify.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

alter table public.profile_socials
  add column tiktok text check (tiktok ~ '^[a-z0-9._]{2,24}$'),
  add column spotify text check (spotify ~ '^[A-Za-z0-9._-]{1,64}$');

-- True if text looks like it has a social handle, a link to one, or a phone number.
-- Keep in step with CONTACT_PATTERNS in src/lib/contact-details.ts.
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
    -- Camera or ghost emoji as a label: "📸: name"
    '(📸|👻)\s*:\s*[a-z0-9_.]{3,}',
    -- 8 or more digits
    '([+]?[0-9][ -]?){8,}'
  ]);
$$;
