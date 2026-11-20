-- Keep the moderator capability helper available to signed-in users for RLS
-- and staff workflows, but do not expose it to anonymous API callers.
revoke execute on function public.is_moderator() from anon;
grant execute on function public.is_moderator() to authenticated;
