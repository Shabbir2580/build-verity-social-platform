-- Scope private ticket evidence to the team assigned to its parent ticket.
-- Ticket evidence paths use: tickets/<user_id>/<ticket_id>/<filename>.
-- No evidence objects currently exist, so tightening this path format does
-- not strand existing files. Appeal evidence keeps its existing owner/staff rules.

drop policy if exists evidence_read_scoped on storage.objects;
create policy evidence_read_scoped on storage.objects
  for select to authenticated
  using (
    bucket_id = 'evidence'
    and (
      (storage.foldername(name))[2] = (select auth.uid())::text
      or (
        (storage.foldername(name))[1] = 'appeals'
        and public.is_moderator()
      )
      or (
        (storage.foldername(name))[1] = 'tickets'
        and exists (
          select 1
          from public.support_tickets t
          where t.id::text = (storage.foldername(name))[3]
            and t.user_id::text = (storage.foldername(name))[2]
            and (
              (t.assigned_team = 'support' and public.is_support())
              or (t.assigned_team = 'trust_safety' and public.is_moderator())
            )
        )
      )
    )
  );

drop policy if exists evidence_upload_own_folder on storage.objects;
create policy evidence_upload_own_folder on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'evidence'
    and public.is_active_user()
    and (
      (
        (storage.foldername(name))[1] = 'appeals'
        and (storage.foldername(name))[2] = (select auth.uid())::text
      )
      or (
        (storage.foldername(name))[1] = 'tickets'
        and (storage.foldername(name))[2] = (select auth.uid())::text
        and exists (
          select 1
          from public.support_tickets t
          where t.id::text = (storage.foldername(name))[3]
            and t.user_id = (select auth.uid())
        )
      )
    )
  );
