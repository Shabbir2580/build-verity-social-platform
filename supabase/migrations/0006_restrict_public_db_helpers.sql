-- Restrict internal authorization helpers to signed-in callers.
-- These functions are used by authenticated RLS policies; none needs anonymous RPC access.
revoke execute on function public.my_role() from public, anon;
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.is_moderator() from public, anon;
revoke execute on function public.is_support() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_active_user() from public, anon;
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon;
revoke execute on function public.community_role(uuid) from public, anon;

grant execute on function public.my_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_moderator() to authenticated;
grant execute on function public.is_support() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.community_role(uuid) to authenticated;

-- Rate limiting is a trigger implementation detail, never a PostgREST RPC.
revoke execute on function public.enforce_rate_limit() from public, anon, authenticated;

-- Prevent callers from probing block relationships between arbitrary accounts.
-- RLS and trigger callers only need to check relationships involving the current user.
create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    auth.uid() is not null
    and (a = auth.uid() or b = auth.uid())
    and exists (
      select 1 from public.blocks
      where (blocker_id = a and blocked_id = b)
         or (blocker_id = b and blocked_id = a)
    ),
    false
  )
$$;
