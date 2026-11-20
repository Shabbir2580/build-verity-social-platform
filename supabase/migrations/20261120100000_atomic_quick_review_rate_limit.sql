-- Make quick-review quota enforcement atomic across concurrent serverless requests.
-- The advisory transaction lock serializes each user's rolling one-hour counter.
create index if not exists audit_logs_actor_action_created_idx
  on public.audit_logs (actor_id, action, created_at desc);

create or replace function public.start_verification_quick_review(
  p_actor_id uuid,
  p_provider text,
  p_kind text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_count integer;
  v_id bigint;
begin
  if p_actor_id is null or p_kind not in ('text', 'image') then
    raise exception 'invalid_quick_review_request';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_actor_id::text, 0)
  );

  select count(*)::integer
    into v_count
    from public.audit_logs
   where actor_id = p_actor_id
     and action = 'verification_quick_review'
     and created_at >= now() - interval '1 hour';

  if v_count >= 5 then
    return null;
  end if;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, details
  ) values (
    p_actor_id,
    'verification_quick_review',
    'verification',
    null,
    jsonb_build_object(
      'provider', left(coalesce(p_provider, 'Google Gemini'), 120),
      'kind', p_kind,
      'status', 'started'
    )
  )
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.start_verification_quick_review(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.start_verification_quick_review(uuid, text, text)
  to service_role;
