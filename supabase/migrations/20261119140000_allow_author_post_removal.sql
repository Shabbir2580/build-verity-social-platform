-- Allow an author to soft-delete only their own published post.
-- Moderators retain their existing moderation permissions; all other status
-- changes by ordinary users remain blocked by the posts_guard trigger.

create or replace function public.guard_post_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id;
  new.author_id := old.author_id;
  new.created_at := old.created_at;

  if not public.is_moderator() then
    if not (
      old.author_id = auth.uid()
      and old.status = 'published'
      and new.status = 'removed'
      and new.removal_reason = 'Deleted by the author'
    ) then
      new.status := old.status;
      new.removal_reason := old.removal_reason;
    end if;
  end if;

  if new.title is distinct from old.title or new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  new.updated_at := now();
  return new;
end
$$;

revoke all on function public.guard_post_update() from public, anon, authenticated;
