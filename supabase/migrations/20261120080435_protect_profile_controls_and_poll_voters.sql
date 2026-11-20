-- Keep profile discovery public while hiding internal account-control fields
-- from anonymous visitors. Signed-in staff/admin interfaces retain their existing
-- profile-column access and continue to enforce authorization through RLS/RPCs.
revoke select on table public.profiles from anon;
grant select (
  id, username, display_name, bio, avatar_url, interests,
  onboarded, show_memberships, created_at, updated_at
) on table public.profiles to anon;

-- Poll votes identify individual voters. Restrict row visibility to the voter.
drop policy if exists poll_votes_select on public.poll_votes;
create policy poll_votes_select on public.poll_votes
for select to authenticated
using (user_id = (select auth.uid()));

revoke select on table public.poll_votes from anon;
