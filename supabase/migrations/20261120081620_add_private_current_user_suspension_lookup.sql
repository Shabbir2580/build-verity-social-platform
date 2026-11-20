-- Return the caller's suspension state without granting access to the profiles column.
-- NULL means no profile row exists; false means active; true means suspended.
create or replace function public.my_is_suspended()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select p.is_suspended
  from public.profiles p
  where p.id = auth.uid()
$function$;

revoke all on function public.my_is_suspended() from public, anon;
grant execute on function public.my_is_suspended() to authenticated;
