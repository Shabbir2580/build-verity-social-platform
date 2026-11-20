-- Direct client-side post mutations are owner-only.
-- Staff moderation remains available through audited SECURITY DEFINER RPCs:
-- admin_manage_post() and staff_decide_case().
drop policy if exists posts_update on public.posts;
create policy posts_update
on public.posts
for update
to authenticated
using (
  author_id = (select auth.uid())
  and public.is_active_user()
)
with check (
  author_id = (select auth.uid())
  and public.is_active_user()
);

drop policy if exists posts_delete on public.posts;
create policy posts_delete
on public.posts
for delete
to authenticated
using (
  author_id = (select auth.uid())
  and public.is_active_user()
);
