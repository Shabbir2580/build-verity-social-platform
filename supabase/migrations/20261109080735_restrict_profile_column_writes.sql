-- Restrict profile writes to the fields members are allowed to edit.
-- RLS remains the row-level boundary; column grants add a separate field-level boundary.
revoke all privileges on table public.profiles from anon;
revoke all privileges on table public.profiles from authenticated;
grant select on table public.profiles to anon;
grant select on table public.profiles to authenticated;
grant update (username, display_name, bio, avatar_url, interests, show_memberships)
  on table public.profiles to authenticated;
