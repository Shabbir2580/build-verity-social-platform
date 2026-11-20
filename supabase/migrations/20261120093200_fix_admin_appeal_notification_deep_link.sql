-- Keep administrator-triggered appeal notifications on the existing Trust Center route.
do $$
declare
  v_definition text;
begin
  v_definition := pg_get_functiondef('public.admin_manage_post(uuid,text,text)'::regprocedure);
  if position('/support?tab=appeals' in v_definition) = 0 then
    raise exception 'Expected stale administrator appeal destination was not found';
  end if;
  execute replace(v_definition, '/support?tab=appeals', '/verify');
end
$$;
