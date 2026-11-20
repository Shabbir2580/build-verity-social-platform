-- Admin-only daily platform activity series for the operations dashboard.
create index if not exists profiles_created_at_idx on public.profiles (created_at);
create index if not exists comments_created_at_active_idx on public.comments (created_at) where is_deleted = false;
create index if not exists reactions_created_at_idx on public.reactions (created_at);
create index if not exists community_memberships_created_at_idx on public.community_memberships (created_at);

create or replace function public.admin_daily_activity_metrics()
returns table (
  activity_date date,
  new_members bigint,
  published_posts bigint,
  comments_created bigint,
  post_reactions bigint,
  community_joins bigint
)
language sql
stable
security definer
set search_path = ''
as $function$
  with days as (
    select generated_day::date as day
    from generate_series(
      (timezone('UTC', now())::date - 6)::timestamp,
      timezone('UTC', now())::date::timestamp,
      interval '1 day'
    ) as generated_day
  )
  select
    days.day,
    (select count(*) from public.profiles p where p.created_at >= (days.day::timestamp at time zone 'UTC') and p.created_at < ((days.day + 1)::timestamp at time zone 'UTC')),
    (select count(*) from public.posts p where p.status = 'published' and p.created_at >= (days.day::timestamp at time zone 'UTC') and p.created_at < ((days.day + 1)::timestamp at time zone 'UTC')),
    (select count(*) from public.comments c where c.is_deleted = false and c.created_at >= (days.day::timestamp at time zone 'UTC') and c.created_at < ((days.day + 1)::timestamp at time zone 'UTC')),
    (select count(*) from public.reactions r where r.created_at >= (days.day::timestamp at time zone 'UTC') and r.created_at < ((days.day + 1)::timestamp at time zone 'UTC')),
    (select count(*) from public.community_memberships cm where cm.created_at >= (days.day::timestamp at time zone 'UTC') and cm.created_at < ((days.day + 1)::timestamp at time zone 'UTC'))
  from days order by days.day;
$function$;

revoke all on function public.admin_daily_activity_metrics() from public;
revoke all on function public.admin_daily_activity_metrics() from anon;
revoke all on function public.admin_daily_activity_metrics() from authenticated;
grant execute on function public.admin_daily_activity_metrics() to service_role;
