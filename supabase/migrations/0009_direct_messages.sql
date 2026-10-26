-- One-on-one messages between crew members (people who both picked "Hang again?").
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run 0001 to 0008 first if you haven't.

-- True if both people picked each other and neither has blocked the other.
create function public.is_crew(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select a <> b
    and exists (select 1 from public.hang_again where from_user = a and to_user = b)
    and exists (select 1 from public.hang_again where from_user = b and to_user = a)
    and not public.is_blocked_between(a, b);
$$;

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create index direct_messages_pair_idx
  on public.direct_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);
create index direct_messages_recipient_unread_idx
  on public.direct_messages (recipient_id) where read_at is null;

alter table public.direct_messages enable row level security;

-- You can read your own conversations, unless one of you blocked the other.
create policy "Users can read their own messages"
  on public.direct_messages for select
  to authenticated
  using (
    (sender_id = auth.uid() or recipient_id = auth.uid())
    and not public.is_blocked_between(sender_id, recipient_id)
  );

-- You can only message your crew, and not while banned.
create policy "Users can message their crew"
  on public.direct_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_crew(sender_id, recipient_id)
    and not public.is_banned(auth.uid())
  );

-- Deliver new messages live.
alter publication supabase_realtime add table public.direct_messages;

-- Marks everything someone sent you as read (there's no update policy, so this is the only way).
create function public.mark_dms_read(other_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.direct_messages
  set read_at = now()
  where recipient_id = auth.uid() and sender_id = other_user and read_at is null;
$$;

-- Your conversations, newest first, followed by crew members you haven't messaged yet.
create function public.my_dm_threads()
returns table (
  other_id uuid,
  display_name text,
  avatar_url text,
  last_body text,
  last_at timestamptz,
  last_from_me boolean,
  unread integer,
  can_message boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select
      case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end as other_id,
      m.body, m.created_at, m.sender_id = auth.uid() as from_me,
      m.recipient_id = auth.uid() and m.read_at is null as is_unread
    from public.direct_messages m
    where (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
      and not public.is_blocked_between(m.sender_id, m.recipient_id)
  ),
  latest as (
    select distinct on (other_id) other_id, body, created_at, from_me
    from mine
    order by other_id, created_at desc
  ),
  unread as (
    select other_id, count(*)::integer as n from mine where is_unread group by other_id
  ),
  people as (
    select other_id from latest
    union
    select c.id from public.my_connections() c
  )
  select p.other_id, pr.display_name, pr.avatar_url,
         l.body, l.created_at, coalesce(l.from_me, false), coalesce(u.n, 0),
         public.is_crew(auth.uid(), p.other_id)
  from people p
  join public.profiles pr on pr.id = p.other_id
  left join latest l on l.other_id = p.other_id
  left join unread u on u.other_id = p.other_id
  order by l.created_at desc nulls last, pr.display_name;
$$;

revoke execute on function public.is_crew(uuid, uuid) from public, anon;
revoke execute on function public.mark_dms_read(uuid) from public, anon;
revoke execute on function public.my_dm_threads() from public, anon;
grant execute on function public.is_crew(uuid, uuid) to authenticated;
grant execute on function public.mark_dms_read(uuid) to authenticated;
grant execute on function public.my_dm_threads() to authenticated;
