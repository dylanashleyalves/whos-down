-- One post per day, and unread message tracking.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run 0001 to 0004 first if you haven't.

-- ---------------------------------------------------------------------------
-- One new activity per person every 24 hours
-- ---------------------------------------------------------------------------

create function public.check_post_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  last_post timestamptz;
begin
  select max(created_at) into last_post
  from public.activities
  where host_id = new.host_id;

  if last_post is not null and last_post > now() - interval '24 hours' then
    raise exception 'You can post one activity a day. Try again after %',
      to_char(last_post + interval '24 hours', 'YYYY-MM-DD HH24:MI "UTC"');
  end if;
  return new;
end;
$$;

create trigger before_activity_insert_post_limit
  before insert on public.activities
  for each row execute function public.check_post_limit();

-- ---------------------------------------------------------------------------
-- When each person last read each group chat
-- ---------------------------------------------------------------------------

create table public.chat_reads (
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

alter table public.chat_reads enable row level security;

create policy "Users can see their own read markers"
  on public.chat_reads for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can add their own read markers"
  on public.chat_reads for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_participant(activity_id));

create policy "Users can update their own read markers"
  on public.chat_reads for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Unread messages per activity you're part of (from others, not blocked people).
create function public.my_unread_counts()
returns table (activity_id uuid, unread bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select m.activity_id, count(*) as unread
  from public.messages m
  left join public.chat_reads r
    on r.activity_id = m.activity_id and r.user_id = auth.uid()
  where public.is_participant(m.activity_id)
    and m.user_id <> auth.uid()
    and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
    and not public.is_blocked_between(m.user_id, auth.uid())
  group by m.activity_id;
$$;

revoke execute on function public.my_unread_counts() from public, anon;
grant execute on function public.my_unread_counts() to authenticated;
