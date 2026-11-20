-- Honor the profile's community-membership privacy setting.
drop policy if exists memberships_select on public.community_memberships;
create policy memberships_select on public.community_memberships
for select to anon, authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.id = community_memberships.user_id
      and p.show_memberships = true
  )
  or public.is_moderator()
);

-- Do not expose media metadata for posts that are not publicly visible.
drop policy if exists post_media_select on public.post_media;
create policy post_media_select on public.post_media
for select to anon, authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_media.post_id
      and (
        p.status in ('published', 'restricted')
        or p.author_id = (select auth.uid())
        or public.is_moderator()
      )
  )
);
