-- Only return engagement counts for posts actually visible in the public feed.
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
    and p.status = 'published'
  group by r.post_id;
end;
$function$;
revoke all on function public.get_post_reaction_counts(uuid[]) from public;
grant execute on function public.get_post_reaction_counts(uuid[]) to anon, authenticated;
