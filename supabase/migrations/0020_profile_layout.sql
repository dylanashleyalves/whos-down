-- Arrange your profile: the order of its sections, and which ones are hidden.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- People already update their own profile row (0002), so no new policy is needed.

alter table public.profiles
  add column section_order text[] not null default '{}'
    check (section_order <@ array['status', 'about', 'kudos', 'crew', 'rank', 'socials']),
  add column hidden_sections text[] not null default '{}'
    check (hidden_sections <@ array['status', 'about', 'kudos', 'crew', 'rank', 'socials']);
