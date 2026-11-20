-- The moderation queue subscribes to case changes so dashboard decisions
-- appear without requiring a manual page refresh.
do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'moderation_cases'
  ) then
    alter publication supabase_realtime add table public.moderation_cases;
  end if;
end
$$;
