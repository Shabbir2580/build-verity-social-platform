create or replace function public.reserve_staff_ai_action(
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_model text,
  p_details jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hour_count bigint;
  v_usage_id bigint;
begin
  if p_actor_id is null then
    raise exception 'actor_required';
  end if;

  if p_action not in ('support.ai_assist', 'moderation.ai_case_summary') then
    raise exception 'invalid_ai_action';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_actor_id::text || ':' || p_action, 0)
  );

  select count(*) into v_hour_count
    from public.audit_logs
   where actor_id = p_actor_id
     and action = p_action
     and created_at >= now() - interval '1 hour';

  if v_hour_count >= 10 then
    return null;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (
    p_actor_id,
    p_action,
    left(coalesce(p_entity_type, 'ai_assistant'), 80),
    left(coalesce(p_entity_id, ''), 120),
    jsonb_build_object(
      'provider', 'Google Gemini',
      'model', left(coalesce(p_model, ''), 100),
      'status', 'started'
    ) || coalesce(p_details, '{}'::jsonb)
  )
  returning id into v_usage_id;

  return v_usage_id;
end;
$$;

revoke all on function public.reserve_staff_ai_action(uuid, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.reserve_staff_ai_action(uuid, text, text, text, text, jsonb) to service_role;
