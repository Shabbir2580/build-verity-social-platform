-- Keep support-only staff out of Trust & Safety tickets and messages.
-- Admins retain both capabilities because is_support() and is_moderator()
-- include the admin role; support and moderator roles remain team-scoped.

drop policy if exists tickets_select on public.support_tickets;
create policy tickets_select on public.support_tickets
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (assigned_team = 'support' and public.is_support())
    or (assigned_team = 'trust_safety' and public.is_moderator())
  );

drop policy if exists tickets_update_staff on public.support_tickets;
create policy tickets_update_staff on public.support_tickets
  for update to authenticated
  using (
    (
      (assigned_team = 'support' and public.is_support())
      or (assigned_team = 'trust_safety' and public.is_moderator())
    )
    and public.is_active_user()
  )
  with check (
    (
      (assigned_team = 'support' and public.is_support())
      or (assigned_team = 'trust_safety' and public.is_moderator())
    )
    and public.is_active_user()
  );

drop policy if exists ticket_messages_select on public.support_ticket_messages;
create policy ticket_messages_select on public.support_ticket_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.support_tickets t
      where t.id = support_ticket_messages.ticket_id
        and (
          (t.assigned_team = 'support' and public.is_support())
          or (t.assigned_team = 'trust_safety' and public.is_moderator())
          or (t.user_id = (select auth.uid()) and not support_ticket_messages.is_internal)
        )
    )
  );

drop policy if exists ticket_messages_insert on public.support_ticket_messages;
create policy ticket_messages_insert on public.support_ticket_messages
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.support_tickets t
      where t.id = support_ticket_messages.ticket_id
        and (
          (t.assigned_team = 'support' and public.is_support())
          or (t.assigned_team = 'trust_safety' and public.is_moderator())
          or (t.user_id = (select auth.uid()) and t.status <> 'resolved')
        )
    )
    and public.is_active_user()
  );
