-- Keep internal role/suspension columns private even from ordinary signed-in users.
-- Public profile discovery continues through an explicit allow-list of safe columns.
revoke select on table public.profiles from anon, authenticated;
grant select (
  id, username, display_name, bio, avatar_url, interests,
  onboarded, show_memberships, created_at, updated_at
) on table public.profiles to anon, authenticated;

revoke all on function public.my_role() from public, anon;
grant execute on function public.my_role() to authenticated;

create or replace function public.admin_list_profiles(
  p_search text default null,
  p_role text default 'all',
  p_status text default 'all',
  p_limit integer default 50,
  p_offset integer default 0
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_rows jsonb;
  v_total bigint;
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;
  if coalesce(p_role, 'all') not in ('all','user','support','moderator','admin') then raise exception 'invalid_role_filter'; end if;
  if coalesce(p_status, 'all') not in ('all','active','suspended') then raise exception 'invalid_status_filter'; end if;

  select count(*) into v_total
  from public.profiles p
  where (v_search is null or p.username ilike '%' || v_search || '%' or p.display_name ilike '%' || v_search || '%')
    and (coalesce(p_role, 'all') = 'all' or p.role = p_role)
    and (coalesce(p_status, 'all') = 'all' or p.is_suspended = (p_status = 'suspended'));

  select coalesce(jsonb_agg(to_jsonb(page_rows)), '[]'::jsonb) into v_rows
  from (
    select p.id, p.username, p.display_name, p.role, p.is_suspended, p.created_at
    from public.profiles p
    where (v_search is null or p.username ilike '%' || v_search || '%' or p.display_name ilike '%' || v_search || '%')
      and (coalesce(p_role, 'all') = 'all' or p.role = p_role)
      and (coalesce(p_status, 'all') = 'all' or p.is_suspended = (p_status = 'suspended'))
    order by p.created_at desc
    limit v_limit offset v_offset
  ) page_rows;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$function$;

create or replace function public.moderation_staff_directory()
returns table(id uuid, username text, display_name text)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;
  return query
  select p.id, p.username, p.display_name
  from public.profiles p
  where p.role in ('moderator','admin') and p.is_suspended = false
  order by p.display_name;
end;
$function$;

revoke all on function public.admin_list_profiles(text,text,text,integer,integer) from public, anon;
grant execute on function public.admin_list_profiles(text,text,text,integer,integer) to authenticated;
revoke all on function public.moderation_staff_directory() from public, anon;
grant execute on function public.moderation_staff_directory() to authenticated;
