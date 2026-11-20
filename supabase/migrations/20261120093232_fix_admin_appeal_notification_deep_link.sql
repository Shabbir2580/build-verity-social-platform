-- Keep administrator-triggered appeal notifications on the existing Trust Center route.
-- Idempotent so the live hotfix can be safely recorded in migration history.
do $$
declare
  v_definition text;
begin
  v_definition := pg_get_functiondef('public.admin_manage_post(uuid,text,text)'::regprocedure);
  if position('/support?tab=appeals' in v_definition) > 0 then
    execute replace(v_definition, '/support?tab=appeals', '/verify');
  elsif position('''/verify''' in v_definition) = 0 then
    raise exception 'Administrator appeal notification destination is neither the expected old nor new route';
  end if;
end
$$;
