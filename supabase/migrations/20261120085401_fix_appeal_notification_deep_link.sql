-- Keep appeal status notifications on the existing Trust Center route.
do $$
begin
  execute replace(
    pg_get_functiondef('public.staff_decide_case(uuid,text,text,text,uuid)'::regprocedure),
    '/support?tab=appeals',
    '/verify'
  );
end
$$;
