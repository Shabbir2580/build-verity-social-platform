-- Audited post management for administrators.
create or replace function public.admin_manage_post(
  p_post_id uuid,
  p_action text,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.posts;
  previous_post jsonb;
  updated_post jsonb;
  case_id uuid;
  next_status text;
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

  if not found then
    raise exception 'post_not_found';
  end if;

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
     jsonb_build_object('reason', trim(p_reason), 'previous_status', target.status,
                        'new_status', next_status, 'moderation_case_id', case_id));

  if target.author_id is distinct from auth.uid() then
    perform public.notify_user(
      target.author_id, auth.uid(), 'moderation', 'moderation',
      case when next_status = 'published'
        then 'An administrator restored your post.'
        when next_status = 'restricted'
        then 'An administrator restricted your post: ' || left(trim(p_reason), 180)
        else 'An administrator removed your post: ' || left(trim(p_reason), 180)
      end,
      '/post/' || p_post_id::text
    );
  end if;
end;
$$;

revoke all on function public.admin_manage_post(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_manage_post(uuid, text, text) to authenticated;
