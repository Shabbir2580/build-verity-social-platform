-- Prevent accidental lockout of the Verity administration console.
-- Serialize administrator roster changes so concurrent requests cannot remove the final active admin.
create or replace function public.admin_set_role(p_user uuid, p_role text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_role text;
  target_suspended boolean;
  active_admins bigint;
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;
  if p_role not in ('user','support','moderator','admin') then raise exception 'invalid_role'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then raise exception 'reason_required'; end if;
  if p_user = auth.uid() then raise exception 'cannot_change_own_role'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('verity_admin_roster', 0));

  select p.role, p.is_suspended
    into target_role, target_suspended
    from public.profiles p
   where p.id = p_user
   for update;
  if not found then raise exception 'profile_not_found'; end if;

  if target_role = 'admin' and target_suspended = false and p_role <> 'admin' then
    select count(*) into active_admins
      from public.profiles p
     where p.role = 'admin' and p.is_suspended = false;
    if active_admins <= 1 then raise exception 'cannot_remove_last_active_admin'; end if;
  end if;

  update public.profiles set role = p_role where id = p_user;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'admin.set_role', 'profile', p_user::text,
          jsonb_build_object('role', p_role, 'reason', trim(p_reason)));
end
$function$;

create or replace function public.admin_set_suspended(p_user uuid, p_suspended boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_role text;
  target_suspended boolean;
  active_admins bigint;
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then raise exception 'reason_required'; end if;
  if p_user = auth.uid() then raise exception 'cannot_suspend_self'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('verity_admin_roster', 0));

  select p.role, p.is_suspended
    into target_role, target_suspended
    from public.profiles p
   where p.id = p_user
   for update;
  if not found then raise exception 'profile_not_found'; end if;

  if p_suspended and target_role = 'admin' and target_suspended = false then
    select count(*) into active_admins
      from public.profiles p
     where p.role = 'admin' and p.is_suspended = false;
    if active_admins <= 1 then raise exception 'cannot_suspend_last_active_admin'; end if;
  end if;

  update public.profiles set is_suspended = p_suspended where id = p_user;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), case when p_suspended then 'admin.suspend' else 'admin.unsuspend' end,
          'profile', p_user::text, jsonb_build_object('reason', trim(p_reason)));
end
$function$;

revoke all on function public.admin_set_role(uuid, text, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text, text) to authenticated, service_role;
revoke all on function public.admin_set_suspended(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_suspended(uuid, boolean, text) to authenticated, service_role;
