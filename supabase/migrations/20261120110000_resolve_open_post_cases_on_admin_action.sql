-- Close any existing moderation/approval cases when an administrator takes
-- a final post-management action from the Admin dashboard. Keep case history
-- and record the dashboard decision against each affected case.
create or replace function public.admin_manage_post(
  p_post_id uuid,
  p_action text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  target public.posts;
  previous_post jsonb;
  updated_post jsonb;
  case_id uuid;
  next_status text;
  open_case public.moderation_cases;
  previous_case jsonb;
  updated_case jsonb;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  if p_action not in ('remove_post', 'restrict_post', 'restore_post') then
    raise exception 'invalid_action';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then
    raise exception 'reason_required';
  end if;

  select * into target
    from public.posts
   where id = p_post_id
   for update;
  if not found then raise exception 'post_not_found'; end if;

  if p_action = 'restore_post' then
    next_status := 'published';
  elsif p_action = 'restrict_post' then
    next_status := 'restricted';
  else
    next_status := 'removed';
  end if;

  if target.status = next_status then
    raise exception 'post_already_in_requested_state';
  end if;

  previous_post := to_jsonb(target);
  update public.posts
     set status = next_status,
         removal_reason = case when next_status = 'published' then null else trim(p_reason) end
   where id = p_post_id
   returning to_jsonb(posts.*) into updated_post;

  -- The previous implementation only inserted a NEW resolved case. It left
  -- the original pending approval/report/appeal case active, so it continued
  -- to appear in the moderation queue after the post was removed/restricted.
  for open_case in
    select *
      from public.moderation_cases
     where post_id = p_post_id
       and status <> 'resolved'
     for update
  loop
    previous_case := to_jsonb(open_case);

    update public.moderation_cases
       set status = 'resolved',
           resolution = trim(p_reason),
           resolved_at = now(),
           updated_at = now(),
           needs_second_review = false
     where id = open_case.id
     returning to_jsonb(moderation_cases.*) into updated_case;

    insert into public.moderation_actions
      (case_id, actor_id, action, reason, previous_state, new_state)
    values
      (open_case.id, auth.uid(), p_action, trim(p_reason), previous_case, updated_case);

    update public.reports
       set status = 'resolved'
     where case_id = open_case.id;

    update public.appeals
       set status = 'resolved',
           final_decision = trim(p_reason),
           decided_at = now()
     where case_id = open_case.id;

    perform public.notify_user(
      a.appellant_id, auth.uid(), 'appeal', 'moderation',
      'An administrator completed an action on the post related to your appeal: ' || left(trim(p_reason), 180),
      '/support?tab=appeals'
    )
      from public.appeals a
     where a.case_id = open_case.id
       and a.appellant_id is distinct from target.author_id;
  end loop;

  -- Preserve a separate audit entry for the administrator's dashboard action.
  insert into public.moderation_cases
    (post_id, case_type, status, priority, opened_by, summary, resolution, resolved_at)
  values
    (p_post_id, 'report', 'resolved', 'normal', auth.uid(),
     left('Admin post management: ' || trim(p_reason), 2000),
     trim(p_reason), now())
  returning id into case_id;

  insert into public.moderation_actions
    (case_id, actor_id, action, reason, previous_state, new_state)
  values
    (case_id, auth.uid(), p_action, trim(p_reason), previous_post, updated_post);

  insert into public.audit_logs
    (actor_id, action, entity_type, entity_id, details)
  values
    (auth.uid(), 'admin.' || p_action, 'post', p_post_id::text,
     jsonb_build_object(
       'reason', trim(p_reason),
       'previous_status', target.status,
       'new_status', next_status,
       'moderation_case_id', case_id
     ));

  if target.author_id is distinct from auth.uid() then
    perform public.notify_user(
      target.author_id, auth.uid(), 'moderation', 'moderation',
      case
        when next_status = 'published' then 'An administrator restored your post.'
        when next_status = 'restricted' then 'An administrator restricted your post: ' || left(trim(p_reason), 180)
        else 'An administrator removed your post: ' || left(trim(p_reason), 180)
      end,
      '/post/' || p_post_id::text
    );
  end if;
end;
$function$;
