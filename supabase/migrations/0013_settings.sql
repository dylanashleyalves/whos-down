-- Settings: choose which notifications you get, and delete your own account.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Then redeploy the push function so it respects the new switches:
--   npx supabase@latest functions deploy push --no-verify-jwt

-- ---------------------------------------------------------------------------
-- Notification types (the existing notifications_enabled is still the master switch)
-- ---------------------------------------------------------------------------

alter table public.profile_private
  add column notify_messages boolean not null default true,   -- group chats and direct messages
  add column notify_joins boolean not null default true,      -- someone joins your activity
  add column notify_reminders boolean not null default true,  -- starting soon, check people in
  add column notify_nudges boolean not null default true;     -- "been quiet lately?"

-- ---------------------------------------------------------------------------
-- Delete my account
-- ---------------------------------------------------------------------------

-- People can remove their own photos (the app does this before deleting the account).
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Deletes the signed-in user. Everything that belongs to them (profile, activities,
-- memberships, messages, crew, push tokens, feedback) goes with it through
-- "on delete cascade". Security definer because only the database owner can delete
-- from auth.users; it can only ever delete the caller.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
