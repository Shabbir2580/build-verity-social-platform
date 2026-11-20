-- Do not expose voter identities through the public reactions table.
drop policy if exists reactions_select on public.reactions;
create policy reactions_select on public.reactions
for select to authenticated
using (user_id = (select auth.uid()));
revoke select on table public.reactions from anon;

-- Public feeds need counts, not a list of the accounts that reacted.
create or replace function public.get_post_reaction_counts(p_post_ids uuid[])
returns table(post_id uuid, reaction_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if coalesce(cardinality(p_post_ids), 0) > 100 then raise exception 'too_many_posts'; end if;
  return query
  select r.post_id, count(*)::bigint
  from public.reactions r
  join public.posts p on p.id = r.post_id
  where r.post_id = any(coalesce(p_post_ids, array[]::uuid[]))
    and p.status in ('published','restricted')
  group by r.post_id;
end;
$function$;

revoke all on function public.get_post_reaction_counts(uuid[]) from public;
grant execute on function public.get_post_reaction_counts(uuid[]) to anon, authenticated;

-- Do not expose individual question voters or their vote values.
drop policy if exists qvotes_select on public.question_votes;
create policy qvotes_select on public.question_votes
for select to authenticated
using (user_id = (select auth.uid()));
revoke select on table public.question_votes from anon;

-- Return only aggregate score and the caller's own vote for each requested answer.
create or replace function public.get_question_vote_summary(p_answer_ids uuid[])
returns table(answer_id uuid, score bigint, my_vote smallint)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if coalesce(cardinality(p_answer_ids), 0) > 200 then raise exception 'too_many_answers'; end if;
  return query
  select qv.answer_id,
         coalesce(sum(qv.value), 0)::bigint,
         coalesce(max(qv.value) filter (where qv.user_id = auth.uid()), 0)::smallint
  from public.question_votes qv
  join public.answers a on a.id = qv.answer_id and a.status = 'published'
  join public.questions q on q.id = a.question_id and q.status = 'published'
  where qv.answer_id = any(coalesce(p_answer_ids, array[]::uuid[]))
  group by qv.answer_id;
end;
$function$;

revoke all on function public.get_question_vote_summary(uuid[]) from public;
grant execute on function public.get_question_vote_summary(uuid[]) to anon, authenticated;
