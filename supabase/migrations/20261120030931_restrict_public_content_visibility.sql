-- Prevent public Data API reads from exposing comments, labels, sources, or AI checks
-- attached to posts/questions that are no longer publicly visible.
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
for select to anon, authenticated
using (
  (
    is_deleted = false
    and (
      (
        post_id is not null
        and exists (
          select 1 from public.posts p
          where p.id = comments.post_id
            and p.status in ('published', 'restricted')
        )
      )
      or
      (
        answer_id is not null
        and exists (
          select 1
          from public.answers a
          join public.questions q on q.id = a.question_id
          where a.id = comments.answer_id
            and a.status = 'published'
            and q.status = 'published'
        )
      )
    )
  )
  or author_id = (select auth.uid())
  or public.is_moderator()
);

drop policy if exists content_checks_select on public.content_checks;
create policy content_checks_select on public.content_checks
for select to anon, authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = content_checks.post_id
      and (
        p.status in ('published', 'restricted')
        or p.author_id = (select auth.uid())
        or public.is_moderator()
      )
  )
);

drop policy if exists labels_select on public.post_labels;
create policy labels_select on public.post_labels
for select to anon, authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_labels.post_id
      and (
        p.status in ('published', 'restricted')
        or p.author_id = (select auth.uid())
        or public.is_moderator()
      )
  )
);

drop policy if exists sources_select on public.post_sources;
create policy sources_select on public.post_sources
for select to anon, authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_sources.post_id
      and (
        p.status in ('published', 'restricted')
        or p.author_id = (select auth.uid())
        or public.is_moderator()
      )
  )
);
