create or replace function public.reserve_admin_ai_assistant_request(
  p_actor_id uuid,
  p_model text,
  p_mode text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hour_count bigint;
  v_day_count bigint;
  v_usage_id bigint;
begin
  if p_actor_id is null then
    raise exception 'actor_required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_actor_id::text || ':admin_ai_assistant', 0)
  );

  select count(*) into v_hour_count
    from public.audit_logs
   where actor_id = p_actor_id
     and action = 'admin_ai_assistant_request'
     and created_at >= now() - interval '1 hour';

  if v_hour_count >= 12 then
    return null;
  end if;

  select count(*) into v_day_count
    from public.audit_logs
   where actor_id = p_actor_id
     and action = 'admin_ai_assistant_request'
     and created_at >= now() - interval '24 hours';

  if v_day_count >= 40 then
    return null;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (
    p_actor_id,
    'admin_ai_assistant_request',
    'ai_assistant',
    null,
    jsonb_build_object(
      'model', left(coalesce(p_model, ''), 100),
      'mode', left(coalesce(p_mode, ''), 24),
      'status', 'started'
    )
  )
  returning id into v_usage_id;

  return v_usage_id;
end;
$$;

revoke all on function public.reserve_admin_ai_assistant_request(uuid, text, text) from public, anon, authenticated;
grant execute on function public.reserve_admin_ai_assistant_request(uuid, text, text) to service_role;
