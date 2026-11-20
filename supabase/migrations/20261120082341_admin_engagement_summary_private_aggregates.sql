-- Keep platform-wide admin analytics accurate without exposing individual reaction rows.
create or replace function public.admin_engagement_summary(p_since timestamptz default now() - interval '14 days')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  since_at timestamptz := greatest(coalesce(p_since, now() - interval '14 days'), now() - interval '90 days');
  comment_total bigint;
  reaction_total bigint;
  membership_total bigint;
  contributor_total bigint;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  select count(*) into comment_total
  from public.comments c
  where c.created_at >= since_at;

  select count(*) into reaction_total
  from public.reactions r
  where r.created_at >= since_at;

  select count(*) into membership_total
  from public.community_memberships cm
  where cm.created_at >= since_at;

  select count(distinct activity.user_id) into contributor_total
  from (
    select p.author_id as user_id from public.posts p where p.created_at >= since_at
    union
    select c.author_id as user_id from public.comments c where c.created_at >= since_at
    union
    select r.user_id from public.reactions r where r.created_at >= since_at
  ) activity
  where activity.user_id is not null;

  return jsonb_build_object(
    'comments', comment_total,
    'reactions', reaction_total,
    'communities', membership_total,
    'contributors', contributor_total
  );
end
$function$;

revoke all on function public.admin_engagement_summary(timestamptz) from public, anon;
grant execute on function public.admin_engagement_summary(timestamptz) to authenticated, service_role;
