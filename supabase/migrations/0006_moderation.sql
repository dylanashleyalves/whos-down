-- Moderation: admins, bans, and tools to review reports.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run 0001 to 0005 first if you haven't.
--
-- Then make yourself an admin (use the email you sign in with):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com';

-- ---------------------------------------------------------------------------
-- Admins: can only be added from the SQL Editor, never from the app
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS on with no policies: the app can't read or change this table directly.
alter table public.admins enable row level security;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Bans
-- ---------------------------------------------------------------------------

create table public.bans (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  reason text,
  banned_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.bans enable row level security;

-- People can see whether they themselves are banned (so the app can tell them).
create policy "Users can see their own ban"
  on public.bans for select
  to authenticated
  using (user_id = auth.uid());

create function public.is_banned(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.bans where user_id = target);
$$;

-- Banned people's activities disappear from everyone else's feed.
drop policy "Signed-in users can view activities" on public.activities;
create policy "Signed-in users can view activities"
  on public.activities for select
  to authenticated
  using (
    host_id = auth.uid()
    or (
      country = public.my_country()
      and not public.is_blocked_between(host_id, auth.uid())
      and not public.is_banned(host_id)
    )
  );

-- Banned people can't post, join or chat.
drop policy "Users can post their own activities" on public.activities;
create policy "Users can post their own activities"
  on public.activities for insert
  to authenticated
  with check (host_id = auth.uid() and not public.is_banned(auth.uid()));

drop policy "Users can join activities" on public.activity_members;
create policy "Users can join activities"
  on public.activity_members for insert
  to authenticated
  with check (user_id = auth.uid() and not public.is_banned(auth.uid()));

drop policy "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_participant(activity_id)
    and not public.is_banned(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Moderation tools (each one checks that the caller is an admin)
-- ---------------------------------------------------------------------------

-- Reports with the names and titles needed to review them, newest first.
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
  target_banned boolean
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
    public.is_banned(coalesce(r.reported_user_id, a.host_id))
  from public.reports r
  left join public.profiles reporter on reporter.id = r.reporter_id
  left join public.profiles reported on reported.id = r.reported_user_id
  left join public.activities a on a.id = r.activity_id
  left join public.profiles host on host.id = a.host_id
  order by (r.status = 'open') desc, r.created_at desc
  limit 200;
end;
$$;

create function public.admin_set_report_status(report_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  update public.reports set status = new_status where id = report_id;
end;
$$;

create function public.admin_delete_activity(target_activity uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  delete from public.activities where id = target_activity;
end;
$$;

-- Bans someone and removes their upcoming activities.
create function public.admin_ban_user(target_user uuid, ban_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  if target_user = auth.uid() then
    raise exception 'You can''t ban yourself';
  end if;

  insert into public.bans (user_id, reason, banned_by)
  values (target_user, ban_reason, auth.uid())
  on conflict (user_id) do update set reason = excluded.reason, banned_by = excluded.banned_by;

  delete from public.activities where host_id = target_user and starts_at > now();
  delete from public.activity_members m
  using public.activities a
  where a.id = m.activity_id and m.user_id = target_user and a.starts_at > now();
end;
$$;

create function public.admin_unban_user(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  delete from public.bans where user_id = target_user;
end;
$$;

-- Helper and admin functions are for signed-in users only (admin ones check further).
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_banned(uuid) from public, anon;
revoke execute on function public.admin_reports() from public, anon;
revoke execute on function public.admin_set_report_status(uuid, text) from public, anon;
revoke execute on function public.admin_delete_activity(uuid) from public, anon;
revoke execute on function public.admin_ban_user(uuid, text) from public, anon;
revoke execute on function public.admin_unban_user(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_banned(uuid) to authenticated;
grant execute on function public.admin_reports() to authenticated;
grant execute on function public.admin_set_report_status(uuid, text) to authenticated;
grant execute on function public.admin_delete_activity(uuid) to authenticated;
grant execute on function public.admin_ban_user(uuid, text) to authenticated;
grant execute on function public.admin_unban_user(uuid) to authenticated;
