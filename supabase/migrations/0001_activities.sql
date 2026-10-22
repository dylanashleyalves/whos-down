-- Activities: "who's down for...?" posts that other people can join.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  category text not null check (category in ('sports', 'gym', 'gaming', 'food', 'outdoors', 'hangout')),
  location text not null check (char_length(location) between 2 and 120),
  starts_at timestamptz not null,
  spots integer not null check (spots between 1 and 50),
  details text check (char_length(details) <= 500),
  created_at timestamptz not null default now()
);

create index activities_starts_at_idx on public.activities (starts_at);

-- Row Level Security: signed-in users can see every activity,
-- but can only create, edit or delete their own.
alter table public.activities enable row level security;

create policy "Signed-in users can view activities"
  on public.activities for select
  to authenticated
  using (true);

create policy "Users can post their own activities"
  on public.activities for insert
  to authenticated
  with check (host_id = auth.uid());

create policy "Users can update their own activities"
  on public.activities for update
  to authenticated
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

create policy "Users can delete their own activities"
  on public.activities for delete
  to authenticated
  using (host_id = auth.uid());
