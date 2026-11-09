-- Prevent authenticated callers from probing whether two unrelated users block each other.
-- RLS callers always pass auth.uid() as one side of the comparison. Internal
-- notification checks also use the acting user's ID when a user initiated the event.
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.uid() = a or auth.uid() = b, false)
    and exists (
      select 1
      from public.blocks
      where (blocker_id = a and blocked_id = b)
         or (blocker_id = b and blocked_id = a)
    )
$$;
