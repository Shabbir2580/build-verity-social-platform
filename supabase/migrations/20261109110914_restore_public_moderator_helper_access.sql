-- Public SELECT policies on posts, questions and answers include a moderator
-- visibility branch. Those policies apply to the anon role as well as
-- authenticated users, so anon must be able to execute this safe boolean helper.
-- is_moderator() returns false unless auth.uid() belongs to an active moderator
-- or administrator; it does not expose profile or role data.
grant execute on function public.is_moderator() to anon;
