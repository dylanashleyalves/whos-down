-- Moderation fixes: banning or deleting closes every related report, and a list of banned people.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Run 0006 first if you haven't.

-- Bans someone, closes every open report about them or their activities, and removes
-- their upcoming activities.
create or replace function public.admin_ban_user(target_user uuid, ban_reason text default null)
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

  -- Close reports first: deleting activities below clears their activity_id.
  update public.reports
  set status = 'actioned'
  where status = 'open'
    and (
      reported_user_id = target_user
      or activity_id in (select id from public.activities where host_id = target_user)
    );

  delete from public.activities where host_id = target_user and starts_at > now();
  delete from public.activity_members m
  using public.activities a
  where a.id = m.activity_id and m.user_id = target_user and a.starts_at > now();
end;
$$;

-- Deletes an activity and closes every open report about it.
create or replace function public.admin_delete_activity(target_activity uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  update public.reports
  set status = 'actioned'
  where status = 'open' and activity_id = target_activity;

  delete from public.activities where id = target_activity;
end;
$$;

-- Everyone who's banned, newest first.
create function public.admin_banned_users()
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  reason text,
  banned_at timestamptz
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
  select b.user_id, p.display_name, p.avatar_url, b.reason, b.created_at
  from public.bans b
  left join public.profiles p on p.id = b.user_id
  order by b.created_at desc;
end;
$$;

revoke execute on function public.admin_banned_users() from public, anon;
grant execute on function public.admin_banned_users() to authenticated;
