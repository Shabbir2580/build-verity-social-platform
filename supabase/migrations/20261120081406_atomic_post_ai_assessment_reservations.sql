-- Serialize per-post AI assessment quotas and reserve each attempt atomically.
create table if not exists public.post_ai_assessment_usage (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  check_type text not null check (check_type in ('media_origin','claim')),
  created_at timestamptz not null default now()
);

create index if not exists post_ai_assessment_usage_window_idx
  on public.post_ai_assessment_usage (post_id, check_type, created_at desc);

alter table public.post_ai_assessment_usage enable row level security;
revoke all on table public.post_ai_assessment_usage from public, anon, authenticated;
grant select, insert, delete on table public.post_ai_assessment_usage to service_role;
grant usage, select on sequence public.post_ai_assessment_usage_id_seq to service_role;

-- Seed the new quota ledger with recent existing attempts so this change does not
-- reset users' limits when it is deployed.
insert into public.post_ai_assessment_usage (post_id, user_id, check_type, created_at)
select cc.post_id, p.author_id, cc.check_type, cc.created_at
from public.content_checks cc
join public.posts p on p.id = cc.post_id
where cc.check_type in ('media_origin','claim')
  and cc.created_at >= now() - interval '1 hour';

create or replace function public.reserve_post_ai_assessment(
  p_post_id uuid,
  p_user_id uuid,
  p_check_type text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_count integer;
begin
  if p_post_id is null or p_user_id is null
     or p_check_type not in ('media_origin','claim') then
    raise exception 'invalid_assessment_reservation';
  end if;

  if not exists (
    select 1 from public.posts p
    where p.id = p_post_id and p.author_id = p_user_id
  ) then
    raise exception 'post_owner_mismatch';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_post_id::text || ':' || p_check_type, 0));

  delete from public.post_ai_assessment_usage
  where created_at < now() - interval '7 days';

  select count(*)::integer into v_count
  from public.post_ai_assessment_usage u
  where u.post_id = p_post_id
    and u.check_type = p_check_type
    and u.created_at >= now() - interval '1 hour';

  if v_count >= 6 then return false; end if;

  insert into public.post_ai_assessment_usage (post_id, user_id, check_type)
  values (p_post_id, p_user_id, p_check_type);

  return true;
end;
$function$;

revoke all on function public.reserve_post_ai_assessment(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_post_ai_assessment(uuid,uuid,text) to service_role;
