-- Verity: helper functions, triggers, RLS policies.

-- ROLE HELPERS (security definer so policies can call them without recursion)
create or replace function public.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('support','moderator','admin') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('moderator','admin') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_support() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('support','admin') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select not is_suspended from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

create or replace function public.community_role(cid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.community_memberships where community_id = cid and user_id = auth.uid()
$$;

-- GENERIC TRIGGERS -----------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Rate limiting: TG_ARGV = (owner column, max rows, window interval)
create or replace function public.enforce_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cnt int;
begin
  if auth.uid() is null then return new; end if;
  execute format('select count(*) from public.%I where %I = $1 and created_at > now() - $2::interval',
                 TG_TABLE_NAME, TG_ARGV[0])
    into cnt using auth.uid(), TG_ARGV[2];
  if cnt >= TG_ARGV[1]::int then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'Too many requests. Please slow down.';
  end if;
  return new;
end $$;

create trigger rl_posts before insert on public.posts for each row execute function public.enforce_rate_limit('author_id','10','10 minutes');
create trigger rl_comments before insert on public.comments for each row execute function public.enforce_rate_limit('author_id','30','10 minutes');
create trigger rl_reports before insert on public.reports for each row execute function public.enforce_rate_limit('reporter_id','10','1 hour');
create trigger rl_communities before insert on public.communities for each row execute function public.enforce_rate_limit('creator_id','3','1 day');
create trigger rl_tickets before insert on public.support_tickets for each row execute function public.enforce_rate_limit('user_id','5','1 hour');
create trigger rl_questions before insert on public.questions for each row execute function public.enforce_rate_limit('author_id','10','1 hour');
create trigger rl_answers before insert on public.answers for each row execute function public.enforce_rate_limit('author_id','20','1 hour');
create trigger rl_appeals before insert on public.appeals for each row execute function public.enforce_rate_limit('appellant_id','10','1 day');
create trigger rl_follows before insert on public.follows for each row execute function public.enforce_rate_limit('follower_id','100','1 hour');

-- AUDIT ----------------------------------------------------------------------
create or replace function public.log_audit(p_action text, p_entity_type text, p_entity_id text, p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'not_authorized'; end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb));
end $$;

-- NOTIFICATIONS --------------------------------------------------------------
create or replace function public.notify_user(
  p_user uuid, p_actor uuid, p_type text, p_pref text, p_message text, p_link text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  allowed boolean;
begin
  if p_user is null or p_user = p_actor then return; end if;
  if p_actor is not null and public.is_blocked_between(p_user, p_actor) then return; end if;
  select coalesce((notification_prefs ->> p_pref)::boolean, true) into allowed
    from public.user_settings where user_id = p_user;
  if allowed is false then return; end if;
  insert into public.notifications (user_id, actor_id, type, message, link)
  values (p_user, p_actor, p_type, left(p_message, 300), p_link);
end $$;

-- PROFILE LIFECYCLE ----------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  uname text;
  dname text;
begin
  uname := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  if uname !~ '^[a-z0-9_]{3,24}$' or exists (select 1 from public.profiles where username = uname) then
    uname := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;
  dname := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), uname), 60);
  insert into public.profiles (id, username, display_name) values (new.id, uname, dname)
    on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if auth.uid() is not null and not public.is_admin()
     and (new.role is distinct from old.role or new.is_suspended is distinct from old.is_suspended) then
    raise exception 'not_authorized' using hint = 'Roles can only be changed by administrators.';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

create trigger user_settings_touch before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- FOLLOWS --------------------------------------------------------------------
create or replace function public.on_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uname text;
begin
  select username into uname from public.profiles where id = new.follower_id;
  perform public.notify_user(new.following_id, new.follower_id, 'follow', 'follows',
    '@' || uname || ' started following you', '/u/' || uname);
  return new;
end $$;
create trigger follows_notify after insert on public.follows for each row execute function public.on_follow();

-- COMMUNITIES ----------------------------------------------------------------
create or replace function public.on_community_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.creator_id is not null then
    insert into public.community_memberships (community_id, user_id, role)
    values (new.id, new.creator_id, 'owner') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger communities_owner after insert on public.communities
  for each row execute function public.on_community_created();

create or replace function public.on_community_join() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c record; uname text;
begin
  if new.role <> 'member' then return new; end if;
  select id, slug, name, creator_id into c from public.communities where id = new.community_id;
  select username into uname from public.profiles where id = new.user_id;
  perform public.notify_user(c.creator_id, new.user_id, 'community', 'communities',
    '@' || uname || ' joined ' || c.name, '/communities/' || c.slug);
  return new;
end $$;
create trigger memberships_notify after insert on public.community_memberships
  for each row execute function public.on_community_join();

-- POSTS ----------------------------------------------------------------------
create or replace function public.guard_post_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id;
  new.author_id := old.author_id;
  new.created_at := old.created_at;
  if not public.is_moderator() then
    new.status := old.status;
    new.removal_reason := old.removal_reason;
  end if;
  if new.title is distinct from old.title or new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger posts_guard before update on public.posts
  for each row execute function public.guard_post_update();

create or replace function public.notify_mentions(p_body text, p_actor uuid, p_link text) returns void
language plpgsql security definer set search_path = '' as $$
declare m text; target uuid; uname text;
begin
  select username into uname from public.profiles where id = p_actor;
  for m in select distinct (regexp_matches(p_body, '@([a-z0-9_]{3,24})', 'g'))[1] limit 10 loop
    select id into target from public.profiles where username = m;
    if target is not null then
      perform public.notify_user(target, p_actor, 'mention', 'mentions', '@' || uname || ' mentioned you', p_link);
    end if;
  end loop;
end $$;

create or replace function public.on_post_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify_mentions(new.body, new.author_id, '/post/' || new.id);
  return new;
end $$;
create trigger posts_mentions after insert on public.posts for each row execute function public.on_post_created();

-- COMMENTS -------------------------------------------------------------------
create or replace function public.on_comment_created() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  target uuid; link text; uname text; parent_author uuid; qid uuid;
begin
  select username into uname from public.profiles where id = new.author_id;
  if new.post_id is not null then
    select author_id into target from public.posts where id = new.post_id;
    link := '/post/' || new.post_id;
  else
    select a.author_id, a.question_id into target, qid from public.answers a where a.id = new.answer_id;
    link := '/questions/' || qid;
  end if;
  if new.parent_id is not null then
    select author_id into parent_author from public.comments where id = new.parent_id;
    perform public.notify_user(parent_author, new.author_id, 'reply', 'comments', '@' || uname || ' replied to your comment', link);
  end if;
  if parent_author is distinct from target then
    perform public.notify_user(target, new.author_id, 'comment', 'comments', '@' || uname || ' commented on your contribution', link);
  end if;
  perform public.notify_mentions(new.body, new.author_id, link);
  return new;
end $$;
create trigger comments_notify after insert on public.comments for each row execute function public.on_comment_created();
create trigger comments_touch before update on public.comments for each row execute function public.touch_updated_at();

-- QUESTIONS / ANSWERS --------------------------------------------------------
create or replace function public.guard_question_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id;
  new.author_id := old.author_id;
  new.created_at := old.created_at;
  if not public.is_moderator() then new.status := old.status; end if;
  if new.accepted_answer_id is not null and not exists (
    select 1 from public.answers where id = new.accepted_answer_id and question_id = new.id
  ) then
    raise exception 'invalid_answer';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger questions_guard before update on public.questions
  for each row execute function public.guard_question_update();

create or replace function public.guard_answer_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id;
  new.author_id := old.author_id;
  new.question_id := old.question_id;
  new.created_at := old.created_at;
  if not public.is_moderator() then new.status := old.status; end if;
  new.updated_at := now();
  return new;
end $$;
create trigger answers_guard before update on public.answers
  for each row execute function public.guard_answer_update();

create or replace function public.on_answer_created() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target uuid; uname text;
begin
  select author_id into target from public.questions where id = new.question_id;
  select username into uname from public.profiles where id = new.author_id;
  perform public.notify_user(target, new.author_id, 'answer', 'answers', '@' || uname || ' answered your question', '/questions/' || new.question_id);
  return new;
end $$;
create trigger answers_notify after insert on public.answers for each row execute function public.on_answer_created();

-- LABELS ---------------------------------------------------------------------
create trigger post_labels_touch before update on public.post_labels
  for each row execute function public.touch_updated_at();

-- REPORTS -> MODERATION CASES -------------------------------------------------
create or replace function public.on_report_created() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cid uuid;
  prio text;
begin
  new.reporter_id := auth.uid();
  new.status := 'open';
  prio := case when new.reason in ('violence','hate','privacy','impersonation') then 'high' else 'normal' end;
  if new.target_type = 'post' then
    select id into cid from public.moderation_cases
      where post_id = new.target_id and case_type = 'report' and status <> 'resolved' limit 1;
    if cid is null then
      insert into public.moderation_cases (post_id, case_type, status, priority, opened_by, summary, due_at)
      values (new.target_id, 'report', 'awaiting_review', prio, new.reporter_id,
              'Reported for ' || new.reason,
              now() + case when prio = 'high' then interval '12 hours' else interval '24 hours' end)
      returning id into cid;
    elsif prio = 'high' then
      update public.moderation_cases set priority = 'high' where id = cid and priority in ('low','normal');
    end if;
    new.case_id := cid;
  end if;
  return new;
end $$;
create trigger reports_case before insert on public.reports for each row execute function public.on_report_created();

-- APPEALS -> MODERATION CASES -------------------------------------------------
create or replace function public.on_appeal_created() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cid uuid;
  ctype text;
  is_repeat boolean;
  author uuid;
begin
  new.appellant_id := auth.uid();
  new.final_decision := null;
  new.decided_at := null;
  select author_id into author from public.posts where id = new.post_id;
  if author is null then raise exception 'post_not_found'; end if;
  if new.label_id is not null and not exists (
    select 1 from public.post_labels where id = new.label_id and post_id = new.post_id
  ) then
    raise exception 'invalid_label';
  end if;
  ctype := case when author = new.appellant_id then 'appeal' else 'label_review' end;
  select exists (
    select 1 from public.appeals
    where appellant_id = new.appellant_id and post_id = new.post_id
      and coalesce(label_id::text,'') = coalesce(new.label_id::text,'') and status = 'resolved'
  ) into is_repeat;
  insert into public.moderation_cases
    (post_id, label_id, case_type, status, priority, opened_by, summary, needs_second_review, due_at)
  values (
    new.post_id, new.label_id, ctype,
    case when is_repeat then 'appealed' else 'awaiting_review' end,
    case when is_repeat then 'high' else 'normal' end,
    new.appellant_id, left(new.reason, 500), is_repeat, now() + interval '24 hours'
  ) returning id into cid;
  new.case_id := cid;
  new.status := case when is_repeat then 'appealed' else 'awaiting_review' end;
  return new;
end $$;
create trigger appeals_case before insert on public.appeals for each row execute function public.on_appeal_created();
create trigger appeals_touch before update on public.appeals for each row execute function public.touch_updated_at();
create trigger cases_touch before update on public.moderation_cases for each row execute function public.touch_updated_at();

-- STAFF DECISION RPC ---------------------------------------------------------
create or replace function public.staff_decide_case(
  p_case_id uuid,
  p_action text,
  p_reason text,
  p_label_value text default null,
  p_assign_to uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  c public.moderation_cases;
  lbl public.post_labels;
  prev jsonb;
  new_case_status text;
  post_author uuid;
  appeal_status text;
  action_id uuid;
  fallback_value text;
begin
  if not public.is_moderator() then raise exception 'not_authorized'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then raise exception 'reason_required'; end if;

  select * into c from public.moderation_cases where id = p_case_id for update;
  if not found then raise exception 'case_not_found'; end if;
  prev := to_jsonb(c);
  if c.label_id is not null then select * into lbl from public.post_labels where id = c.label_id; end if;
  select author_id into post_author from public.posts where id = c.post_id;

  new_case_status := 'resolved';

  if p_action = 'start_review' then
    new_case_status := 'under_review';
    update public.moderation_cases set assigned_to = auth.uid() where id = c.id;
  elsif p_action = 'assign' then
    if p_assign_to is null or not exists (
      select 1 from public.profiles where id = p_assign_to and role in ('moderator','admin')
    ) then raise exception 'invalid_assignee'; end if;
    new_case_status := 'under_review';
    update public.moderation_cases set assigned_to = p_assign_to where id = c.id;
  elsif p_action = 'request_info' then
    new_case_status := 'awaiting_information';
  elsif p_action = 'escalate' then
    new_case_status := 'under_review';
    update public.moderation_cases set priority = 'urgent', needs_second_review = true where id = c.id;
  elsif p_action = 'confirm' then
    if lbl.id is null then raise exception 'no_label'; end if;
    update public.post_labels set status = 'superseded' where id = lbl.id;
    insert into public.post_labels (post_id, dimension, value, basis, evidence_check_id, explanation, created_by)
    values (lbl.post_id, lbl.dimension, lbl.value, 'human_review', lbl.evidence_check_id, p_reason, auth.uid());
  elsif p_action = 'correct' then
    if lbl.id is null or p_label_value is null then raise exception 'label_value_required'; end if;
    update public.post_labels set status = 'superseded' where id = lbl.id;
    insert into public.post_labels (post_id, dimension, value, basis, explanation, created_by)
    values (lbl.post_id, lbl.dimension, p_label_value, 'human_review', p_reason, auth.uid());
  elsif p_action = 'remove_label' then
    if lbl.id is null then raise exception 'no_label'; end if;
    update public.post_labels set status = 'removed', explanation = coalesce(explanation,'') where id = lbl.id;
  elsif p_action = 'mark_unresolved' then
    if lbl.id is not null then
      fallback_value := case lbl.dimension when 'origin' then 'origin_uncertain'
                                           when 'accuracy' then 'not_verified' else lbl.value end;
      update public.post_labels set status = 'superseded' where id = lbl.id;
      insert into public.post_labels (post_id, dimension, value, basis, explanation, created_by)
      values (lbl.post_id, lbl.dimension, fallback_value, 'human_review', p_reason, auth.uid());
    end if;
  elsif p_action = 'restore_post' then
    update public.posts set status = 'published', removal_reason = null where id = c.post_id;
  elsif p_action = 'restrict_post' then
    update public.posts set status = 'restricted', removal_reason = p_reason where id = c.post_id;
  elsif p_action = 'remove_post' then
    update public.posts set status = 'removed', removal_reason = p_reason where id = c.post_id;
  elsif p_action = 'dismiss' then
    null;
  else
    raise exception 'unknown_action';
  end if;

  update public.moderation_cases
    set status = new_case_status,
        resolution = case when new_case_status = 'resolved' then p_reason else resolution end,
        resolved_at = case when new_case_status = 'resolved' then now() else null end
    where id = c.id;

  insert into public.moderation_actions (case_id, actor_id, action, reason, previous_state, new_state)
  values (c.id, auth.uid(), p_action, p_reason, prev,
          (select to_jsonb(mc) from public.moderation_cases mc where mc.id = c.id))
  returning id into action_id;

  appeal_status := case new_case_status
    when 'resolved' then 'resolved'
    when 'awaiting_information' then 'awaiting_information'
    else 'under_review' end;
  update public.appeals
    set status = appeal_status,
        final_decision = case when appeal_status = 'resolved' then p_reason else final_decision end,
        decided_at = case when appeal_status = 'resolved' then now() else decided_at end
    where case_id = c.id;

  update public.reports set status = case when new_case_status = 'resolved' then 'resolved' else 'reviewing' end
    where case_id = c.id;

  if new_case_status in ('resolved','awaiting_information') then
    perform public.notify_user(post_author, null, 'moderation', 'moderation',
      case when new_case_status = 'resolved' then 'A review of your post has been completed: ' || left(p_reason, 200)
           else 'Reviewers need more information about your post' end,
      '/post/' || c.post_id);
    perform public.notify_user(a.appellant_id, null, 'appeal', 'moderation',
      case when new_case_status = 'resolved' then 'Your review request has a decision: ' || left(p_reason, 200)
           else 'Reviewers need more information for your request' end,
      '/support?tab=appeals')
      from public.appeals a where a.case_id = c.id and a.appellant_id is distinct from post_author;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'moderation.' || p_action, 'moderation_case', c.id::text,
          jsonb_build_object('reason', p_reason, 'label_value', p_label_value, 'action_id', action_id, 'post_id', c.post_id));
end $$;

-- ADMIN RPCs -----------------------------------------------------------------
create or replace function public.admin_set_role(p_user uuid, p_role text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;
  if p_role not in ('user','support','moderator','admin') then raise exception 'invalid_role'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then raise exception 'reason_required'; end if;
  if p_user = auth.uid() then raise exception 'cannot_change_own_role'; end if;
  update public.profiles set role = p_role where id = p_user;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'admin.set_role', 'profile', p_user::text, jsonb_build_object('role', p_role, 'reason', p_reason));
end $$;

create or replace function public.admin_set_suspended(p_user uuid, p_suspended boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_authorized'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then raise exception 'reason_required'; end if;
  if p_user = auth.uid() then raise exception 'cannot_suspend_self'; end if;
  update public.profiles set is_suspended = p_suspended where id = p_user;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), case when p_suspended then 'admin.suspend' else 'admin.unsuspend' end,
          'profile', p_user::text, jsonb_build_object('reason', p_reason));
end $$;

-- SUPPORT TICKETS ------------------------------------------------------------
create or replace function public.on_ticket_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.user_id := auth.uid();
  new.status := 'received';
  new.assigned_to := null;
  new.resolution := null;
  new.escalated := false;
  new.priority := case
    when new.category in ('harmful_content','impersonation_privacy') then 'high'
    when new.category in ('account_recovery','removed_post_appeal','incorrect_ai_label','incorrect_misinformation_label') then 'normal'
    when new.category = 'general' then 'low'
    else 'normal' end;
  new.assigned_team := case
    when new.category in ('incorrect_ai_label','incorrect_misinformation_label','removed_post_appeal','harmful_content','impersonation_privacy')
      then 'trust_safety' else 'support' end;
  new.response_due_at := now() + case new.priority
    when 'urgent' then interval '4 hours'
    when 'high' then interval '12 hours'
    when 'low' then interval '72 hours'
    else interval '24 hours' end;
  return new;
end $$;
create trigger tickets_defaults before insert on public.support_tickets
  for each row execute function public.on_ticket_created();

create or replace function public.on_ticket_updated() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id;
  new.user_id := old.user_id;
  new.ticket_number := old.ticket_number;
  new.created_at := old.created_at;
  if new.status = 'resolved' and old.status <> 'resolved' then new.resolved_at := now(); end if;
  if new.status <> 'resolved' then new.resolved_at := null; end if;
  new.updated_at := now();
  if new.status is distinct from old.status then
    perform public.notify_user(new.user_id, auth.uid(), 'support', 'support',
      'Your ticket VER-' || lpad(new.ticket_number::text, 6, '0') || ' is now ' || replace(new.status, '_', ' '),
      '/support/tickets/' || new.id);
  end if;
  return new;
end $$;
create trigger tickets_guard before update on public.support_tickets
  for each row execute function public.on_ticket_updated();

create or replace function public.on_ticket_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t public.support_tickets;
begin
  new.author_id := auth.uid();
  new.is_staff := public.is_staff();
  if not new.is_staff then new.is_internal := false; end if;
  select * into t from public.support_tickets where id = new.ticket_id;
  if new.is_staff and not new.is_internal then
    perform public.notify_user(t.user_id, new.author_id, 'support', 'support',
      'Support replied to VER-' || lpad(t.ticket_number::text, 6, '0'), '/support/tickets/' || t.id);
  elsif not new.is_staff and t.status = 'awaiting_information' then
    update public.support_tickets set status = 'under_review' where id = t.id;
  end if;
  return new;
end $$;
create trigger ticket_messages_defaults before insert on public.support_ticket_messages
  for each row execute function public.on_ticket_message();

-- ROW LEVEL SECURITY ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.blocks enable row level security;
alter table public.follows enable row level security;
alter table public.communities enable row level security;
alter table public.community_memberships enable row level security;
alter table public.community_rules enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.content_checks enable row level security;
alter table public.post_labels enable row level security;
alter table public.post_sources enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.question_votes enable row level security;
alter table public.question_links enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.bookmarks enable row level security;
alter table public.moderation_cases enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.reports enable row level security;
alter table public.appeals enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: public read; owner update (role guarded by trigger); no client insert/delete
create policy profiles_select on public.profiles for select using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy user_settings_own on public.user_settings for select to authenticated using (user_id = auth.uid());
create policy user_settings_update_own on public.user_settings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy blocks_own_select on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy blocks_own_insert on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy blocks_own_delete on public.blocks for delete to authenticated using (blocker_id = auth.uid());

create policy follows_select on public.follows for select using (true);
create policy follows_insert on public.follows for insert to authenticated
  with check (follower_id = auth.uid() and public.is_active_user() and not public.is_blocked_between(follower_id, following_id));
create policy follows_delete on public.follows for delete to authenticated using (follower_id = auth.uid());

-- communities
create policy communities_select on public.communities for select using (true);
create policy communities_insert on public.communities for insert to authenticated
  with check (creator_id = auth.uid() and public.is_active_user());
create policy communities_update on public.communities for update to authenticated
  using (public.community_role(id) in ('owner','moderator') or public.is_moderator())
  with check (public.community_role(id) in ('owner','moderator') or public.is_moderator());
create policy communities_delete on public.communities for delete to authenticated
  using (public.community_role(id) = 'owner' or public.is_admin());

create policy memberships_select on public.community_memberships for select using (true);
create policy memberships_join on public.community_memberships for insert to authenticated
  with check (user_id = auth.uid() and role = 'member' and public.is_active_user());
create policy memberships_leave on public.community_memberships for delete to authenticated
  using ((user_id = auth.uid() and role <> 'owner') or public.community_role(community_id) = 'owner' or public.is_moderator());
create policy memberships_role on public.community_memberships for update to authenticated
  using (public.community_role(community_id) = 'owner')
  with check (public.community_role(community_id) = 'owner' and role in ('member','moderator'));

create policy rules_select on public.community_rules for select using (true);
create policy rules_write on public.community_rules for all to authenticated
  using (public.community_role(community_id) in ('owner','moderator') or public.is_moderator())
  with check (public.community_role(community_id) in ('owner','moderator') or public.is_moderator());

-- posts
create policy posts_select on public.posts for select
  using (status in ('published','restricted') or author_id = auth.uid() or public.is_moderator());
create policy posts_insert on public.posts for insert to authenticated
  with check (
    author_id = auth.uid() and status = 'published' and public.is_active_user()
    and (community_id is null or public.community_role(community_id) is not null)
  );
create policy posts_update on public.posts for update to authenticated
  using (author_id = auth.uid() or public.is_moderator())
  with check (author_id = auth.uid() or public.is_moderator());
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_moderator());

create policy post_media_select on public.post_media for select using (
  exists (select 1 from public.posts p where p.id = post_id)
);
create policy post_media_insert on public.post_media for insert to authenticated with check (
  exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  and split_part(storage_path, '/', 1) = auth.uid()::text
);
create policy post_media_delete on public.post_media for delete to authenticated using (
  exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()) or public.is_moderator()
);

create policy poll_options_select on public.poll_options for select using (true);
create policy poll_options_insert on public.poll_options for insert to authenticated with check (
  exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid() and p.type = 'poll')
);
create policy poll_votes_select on public.poll_votes for select using (true);
create policy poll_votes_insert on public.poll_votes for insert to authenticated with check (
  user_id = auth.uid() and public.is_active_user()
  and exists (select 1 from public.poll_options o where o.id = option_id and o.post_id = poll_votes.post_id)
);
create policy poll_votes_delete on public.poll_votes for delete to authenticated using (user_id = auth.uid());

-- verification: public read; writes only through server (service role) or staff RPC
create policy content_checks_select on public.content_checks for select using (true);
create policy labels_select on public.post_labels for select using (true);
create policy labels_insert_creator on public.post_labels for insert to authenticated with check (
  basis = 'creator_declared' and created_by = auth.uid() and dimension in ('origin','intent')
  and value in ('creator_declared_ai','meme','entertainment','satire','parody','fiction','educational','news','opinion','original')
  and exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
);
create policy labels_delete_creator on public.post_labels for delete to authenticated using (
  basis = 'creator_declared' and created_by = auth.uid()
);
create policy sources_select on public.post_sources for select using (true);
create policy sources_insert on public.post_sources for insert to authenticated with check (
  added_by = auth.uid() and origin = 'user'
  and exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
);
create policy sources_delete on public.post_sources for delete to authenticated using (
  (added_by = auth.uid() and origin = 'user') or public.is_moderator()
);

-- questions / answers
create policy questions_select on public.questions for select
  using (status = 'published' or author_id = auth.uid() or public.is_moderator());
create policy questions_insert on public.questions for insert to authenticated
  with check (author_id = auth.uid() and status = 'published' and accepted_answer_id is null and public.is_active_user());
create policy questions_update on public.questions for update to authenticated
  using (author_id = auth.uid() or public.is_moderator()) with check (author_id = auth.uid() or public.is_moderator());
create policy questions_delete on public.questions for delete to authenticated
  using (author_id = auth.uid() or public.is_moderator());

create policy answers_select on public.answers for select
  using (status = 'published' or author_id = auth.uid() or public.is_moderator());
create policy answers_insert on public.answers for insert to authenticated with check (
  author_id = auth.uid() and status = 'published' and public.is_active_user()
  and exists (select 1 from public.questions q where q.id = question_id and q.status = 'published'
              and not public.is_blocked_between(q.author_id, auth.uid()))
);
create policy answers_update on public.answers for update to authenticated
  using (author_id = auth.uid() or public.is_moderator()) with check (author_id = auth.uid() or public.is_moderator());
create policy answers_delete on public.answers for delete to authenticated
  using (author_id = auth.uid() or public.is_moderator());

create policy qvotes_select on public.question_votes for select using (true);
create policy qvotes_insert on public.question_votes for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());
create policy qvotes_update on public.question_votes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy qvotes_delete on public.question_votes for delete to authenticated using (user_id = auth.uid());

create policy qlinks_select on public.question_links for select using (true);
create policy qlinks_insert on public.question_links for insert to authenticated with check (
  created_by = auth.uid()
  and exists (select 1 from public.questions q where q.id = question_id and q.author_id = auth.uid())
);
create policy qlinks_delete on public.question_links for delete to authenticated using (
  created_by = auth.uid() or public.is_moderator()
);

-- comments
create policy comments_select on public.comments for select using (true);
create policy comments_insert on public.comments for insert to authenticated with check (
  author_id = auth.uid() and is_deleted = false and public.is_active_user()
  and (
    (post_id is not null and exists (
      select 1 from public.posts p where p.id = post_id and p.status = 'published'
        and not public.is_blocked_between(p.author_id, auth.uid())))
    or
    (answer_id is not null and exists (
      select 1 from public.answers a where a.id = answer_id and a.status = 'published'
        and not public.is_blocked_between(a.author_id, auth.uid())))
  )
);
create policy comments_update on public.comments for update to authenticated
  using (author_id = auth.uid() or public.is_moderator()) with check (author_id = auth.uid() or public.is_moderator());
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_moderator());

create policy reactions_select on public.reactions for select using (true);
create policy reactions_insert on public.reactions for insert to authenticated with check (
  user_id = auth.uid() and public.is_active_user()
  and exists (select 1 from public.posts p where p.id = post_id and not public.is_blocked_between(p.author_id, auth.uid()))
);
create policy reactions_delete on public.reactions for delete to authenticated using (user_id = auth.uid());

create policy bookmarks_own_select on public.bookmarks for select to authenticated using (user_id = auth.uid());
create policy bookmarks_own_insert on public.bookmarks for insert to authenticated with check (user_id = auth.uid());
create policy bookmarks_own_delete on public.bookmarks for delete to authenticated using (user_id = auth.uid());

-- moderation: moderators only; users see cases tied to their own appeals or posts (read-only)
create policy cases_select on public.moderation_cases for select to authenticated using (
  public.is_moderator()
  or opened_by = auth.uid()
  or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
);
create policy cases_select_public_label on public.moderation_cases for select to anon using (false);
create policy actions_select on public.moderation_actions for select to authenticated using (public.is_moderator());

create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_moderator());
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_active_user());
create policy reports_update on public.reports for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

create policy appeals_select on public.appeals for select to authenticated
  using (appellant_id = auth.uid() or public.is_moderator());
create policy appeals_insert on public.appeals for insert to authenticated
  with check (appellant_id = auth.uid());
create policy appeals_update_info on public.appeals for update to authenticated
  using (appellant_id = auth.uid() and status = 'awaiting_information')
  with check (appellant_id = auth.uid());

-- support
create policy tickets_select on public.support_tickets for select to authenticated
  using (user_id = auth.uid() or public.is_support()
         or (assigned_team = 'trust_safety' and public.is_moderator()));
create policy tickets_insert on public.support_tickets for insert to authenticated
  with check (user_id = auth.uid());
create policy tickets_update_staff on public.support_tickets for update to authenticated
  using (public.is_support() or (assigned_team = 'trust_safety' and public.is_moderator()))
  with check (public.is_support() or (assigned_team = 'trust_safety' and public.is_moderator()));

create policy ticket_messages_select on public.support_ticket_messages for select to authenticated using (
  exists (select 1 from public.support_tickets t where t.id = ticket_id and (
    public.is_support() or (t.assigned_team = 'trust_safety' and public.is_moderator())
    or (t.user_id = auth.uid() and not is_internal)
  ))
);
create policy ticket_messages_insert on public.support_ticket_messages for insert to authenticated with check (
  author_id = auth.uid() and exists (
    select 1 from public.support_tickets t where t.id = ticket_id and (
      public.is_support() or (t.assigned_team = 'trust_safety' and public.is_moderator())
      or (t.user_id = auth.uid() and t.status <> 'resolved')
    )
  )
);

-- notifications
create policy notifications_own_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_own_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

-- audit logs: admins read; no client writes (only security definer functions)
create policy audit_select_admin on public.audit_logs for select to authenticated using (public.is_admin());

-- Lock down RPCs to authenticated callers
revoke execute on function public.staff_decide_case(uuid, text, text, text, uuid) from public, anon;
revoke execute on function public.admin_set_role(uuid, text, text) from public, anon;
revoke execute on function public.admin_set_suspended(uuid, boolean, text) from public, anon;
revoke execute on function public.log_audit(text, text, text, jsonb) from public, anon;
revoke execute on function public.notify_user(uuid, uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.notify_mentions(text, uuid, text) from public, anon, authenticated;
grant execute on function public.staff_decide_case(uuid, text, text, text, uuid) to authenticated;
grant execute on function public.admin_set_role(uuid, text, text) to authenticated;
grant execute on function public.admin_set_suspended(uuid, boolean, text) to authenticated;
grant execute on function public.log_audit(text, text, text, jsonb) to authenticated;

-- STORAGE --------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('post-media', 'post-media', true, 52428800,
   array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']),
  ('evidence', 'evidence', false, 10485760,
   array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "post_media_upload_own_folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "post_media_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "evidence_upload_own_folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence'
    and (storage.foldername(name))[1] in ('appeals','tickets')
    and (storage.foldername(name))[2] = auth.uid()::text);
create policy "evidence_read_scoped" on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and (
    (storage.foldername(name))[2] = auth.uid()::text
    or ((storage.foldername(name))[1] = 'appeals' and public.is_moderator())
    or ((storage.foldername(name))[1] = 'tickets' and public.is_support())
  ));
