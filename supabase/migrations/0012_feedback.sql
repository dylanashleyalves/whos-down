-- Feedback: testers can send a note from the Profile tab; admins read it on the
-- Moderation screen. Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- How much feedback you've sent in the last day. Security definer because people
-- can't read the feedback table themselves, so the policy below couldn't count it.
create function public.my_feedback_today()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.feedback
  where user_id = auth.uid() and created_at > now() - interval '1 day';
$$;

revoke execute on function public.my_feedback_today() from public, anon;
grant execute on function public.my_feedback_today() to authenticated;

-- Anyone signed in can send feedback as themselves, at most 10 a day.
create policy "send own feedback" on public.feedback
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.my_feedback_today() < 10);

-- Only admins can read it.
create policy "admins read feedback" on public.feedback
  for select to authenticated
  using (public.is_admin());

-- Admins can clear it once dealt with.
create policy "admins delete feedback" on public.feedback
  for delete to authenticated
  using (public.is_admin());
