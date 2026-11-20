-- Public-read RLS policies call is_moderator(); allow anonymous evaluation.
-- The helper returns false for anonymous callers because auth.uid() is NULL and
-- is_active_user() requires an authenticated, non-suspended profile.
grant execute on function public.is_moderator() to anon;
