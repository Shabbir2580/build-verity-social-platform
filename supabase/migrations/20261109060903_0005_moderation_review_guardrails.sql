-- Moderation assignment and independent second-review safeguards.
alter table public.moderation_cases
  add column if not exists second_review_requested_by uuid references public.profiles(id) on delete set null;

create or replace function public.on_appeal_created() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cid uuid; ctype text; is_repeat boolean; author uuid; prior_reviewer uuid;
begin
  new.appellant_id := auth.uid();
  new.final_decision := null; new.decided_at := null;
  select author_id into author from public.posts where id = new.post_id;
  if author is null then raise exception 'post_not_found'; end if;
  if new.label_id is not null and not exists (
    select 1 from public.post_labels where id = new.label_id and post_id = new.post_id
  ) then raise exception 'invalid_label'; end if;
  ctype := case when author = new.appellant_id then 'appeal' else 'label_review' end;
  select exists (
    select 1 from public.appeals where appellant_id = new.appellant_id and post_id = new.post_id
      and coalesce(label_id::text,'') = coalesce(new.label_id::text,'') and status = 'resolved'
  ) into is_repeat;
  if is_repeat then
    select ma.actor_id into prior_reviewer
    from public.appeals a join public.moderation_actions ma on ma.case_id = a.case_id
    where a.appellant_id = new.appellant_id and a.post_id = new.post_id
      and coalesce(a.label_id::text,'') = coalesce(new.label_id::text,'')
      and a.status = 'resolved'
      and ma.action not in ('start_review','assign','request_info','escalate')
    order by ma.created_at desc limit 1;
  end if;
  insert into public.moderation_cases
    (post_id,label_id,case_type,status,priority,opened_by,summary,needs_second_review,second_review_requested_by,due_at)
  values (new.post_id,new.label_id,ctype,
    case when is_repeat then 'appealed' else 'awaiting_review' end,
    case when is_repeat then 'high' else 'normal' end,
    new.appellant_id,left(new.reason,500),is_repeat,prior_reviewer,now()+interval '24 hours')
  returning id into cid;
  new.case_id := cid;
  new.status := case when is_repeat then 'appealed' else 'awaiting_review' end;
  return new;
end $$;

create or replace function public.staff_decide_case(
  p_case_id uuid,p_action text,p_reason text,p_label_value text default null,p_assign_to uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  c public.moderation_cases; lbl public.post_labels; prev jsonb;
  new_case_status text; post_author uuid; appeal_status text; action_id uuid;
  fallback_value text; is_admin_actor boolean := public.is_admin(); is_final_action boolean;
begin
  if not public.is_moderator() then raise exception 'not_authorized'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then raise exception 'reason_required'; end if;
  select * into c from public.moderation_cases where id=p_case_id for update;
  if not found then raise exception 'case_not_found'; end if;
  if c.status='resolved' then raise exception 'case_already_resolved'; end if;
  prev := to_jsonb(c);
  if c.label_id is not null then select * into lbl from public.post_labels where id=c.label_id; end if;
  select author_id into post_author from public.posts where id=c.post_id;
  is_final_action := p_action in ('confirm','correct','remove_label','mark_unresolved','restore_post','restrict_post','remove_post','dismiss');

  if p_action='assign' then
    if not is_admin_actor then raise exception 'admin_assignment_required'; end if;
    if p_assign_to is null or not exists (
      select 1 from public.profiles where id=p_assign_to and role in ('moderator','admin') and is_suspended=false
    ) then raise exception 'invalid_assignee'; end if;
    if c.needs_second_review and c.second_review_requested_by is not null
      and p_assign_to=c.second_review_requested_by then raise exception 'independent_reviewer_required'; end if;
    update public.moderation_cases set assigned_to=p_assign_to,status='under_review',resolved_at=null where id=c.id;
    new_case_status := 'under_review';
  elsif p_action='start_review' then
    if c.assigned_to is not null and c.assigned_to<>auth.uid() then raise exception 'case_assigned_to_another_reviewer'; end if;
    if c.needs_second_review and c.second_review_requested_by is not null
      and auth.uid()=c.second_review_requested_by then raise exception 'independent_reviewer_required'; end if;
    update public.moderation_cases set assigned_to=coalesce(assigned_to,auth.uid()),status='under_review',resolved_at=null where id=c.id;
    new_case_status := 'under_review';
  else
    if c.assigned_to is distinct from auth.uid() then raise exception 'case_must_be_assigned_to_you'; end if;
    if c.needs_second_review and is_final_action and c.second_review_requested_by is not null
      and auth.uid()=c.second_review_requested_by then raise exception 'independent_reviewer_required'; end if;
    new_case_status := 'resolved';
    if p_action='request_info' then
      new_case_status := 'awaiting_information';
    elsif p_action='escalate' then
      new_case_status := 'under_review';
      update public.moderation_cases set priority='urgent',needs_second_review=true,
        second_review_requested_by=auth.uid(),assigned_to=null where id=c.id;
    elsif p_action='confirm' then
      if lbl.id is null then raise exception 'no_label'; end if;
      update public.post_labels set status='superseded' where id=lbl.id;
      insert into public.post_labels(post_id,dimension,value,basis,evidence_check_id,explanation,created_by)
      values(lbl.post_id,lbl.dimension,lbl.value,'human_review',lbl.evidence_check_id,p_reason,auth.uid());
    elsif p_action='correct' then
      if lbl.id is null or p_label_value is null or char_length(trim(p_label_value))=0 then raise exception 'label_value_required'; end if;
      update public.post_labels set status='superseded' where id=lbl.id;
      insert into public.post_labels(post_id,dimension,value,basis,explanation,created_by)
      values(lbl.post_id,lbl.dimension,p_label_value,'human_review',p_reason,auth.uid());
    elsif p_action='remove_label' then
      if lbl.id is null then raise exception 'no_label'; end if;
      update public.post_labels set status='removed',explanation=coalesce(explanation,'') where id=lbl.id;
    elsif p_action='mark_unresolved' then
      if lbl.id is not null then
        fallback_value := case lbl.dimension when 'origin' then 'origin_uncertain' when 'accuracy' then 'not_verified' else lbl.value end;
        update public.post_labels set status='superseded' where id=lbl.id;
        insert into public.post_labels(post_id,dimension,value,basis,explanation,created_by)
        values(lbl.post_id,lbl.dimension,fallback_value,'human_review',p_reason,auth.uid());
      end if;
    elsif p_action='restore_post' then
      update public.posts set status='published',removal_reason=null where id=c.post_id;
    elsif p_action='restrict_post' then
      update public.posts set status='restricted',removal_reason=p_reason where id=c.post_id;
    elsif p_action='remove_post' then
      update public.posts set status='removed',removal_reason=p_reason where id=c.post_id;
    elsif p_action='dismiss' then null;
    else raise exception 'unknown_action';
    end if;
  end if;

  update public.moderation_cases set status=new_case_status,
    resolution=case when new_case_status='resolved' then p_reason else resolution end,
    resolved_at=case when new_case_status='resolved' then now() else null end,
    needs_second_review=case when new_case_status='resolved' then false else needs_second_review end
    where id=c.id;
  insert into public.moderation_actions(case_id,actor_id,action,reason,previous_state,new_state)
    values(c.id,auth.uid(),p_action,p_reason,prev,(select to_jsonb(mc) from public.moderation_cases mc where mc.id=c.id))
    returning id into action_id;
  appeal_status := case new_case_status when 'resolved' then 'resolved' when 'awaiting_information' then 'awaiting_information' else 'under_review' end;
  update public.appeals set status=appeal_status,
    final_decision=case when appeal_status='resolved' then p_reason else final_decision end,
    decided_at=case when appeal_status='resolved' then now() else decided_at end where case_id=c.id;
  update public.reports set status=case when new_case_status='resolved' then 'resolved' else 'reviewing' end where case_id=c.id;
  if new_case_status in ('resolved','awaiting_information') then
    perform public.notify_user(post_author,null,'moderation','moderation',
      case when new_case_status='resolved' then 'A review of your post has been completed: '||left(p_reason,200)
      else 'Reviewers need more information about your post' end,'/post/'||c.post_id);
    perform public.notify_user(a.appellant_id,null,'appeal','moderation',
      case when new_case_status='resolved' then 'Your review request has a decision: '||left(p_reason,200)
      else 'Reviewers need more information for your request' end,'/support?tab=appeals')
      from public.appeals a where a.case_id=c.id and a.appellant_id is distinct from post_author;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),'moderation.'||p_action,'moderation_case',c.id::text,
    jsonb_build_object('reason',p_reason,'label_value',p_label_value,'action_id',action_id,'post_id',c.post_id));
end $$;

revoke execute on function public.on_appeal_created() from public,anon,authenticated;
revoke execute on function public.staff_decide_case(uuid,text,text,text,uuid) from public,anon;
grant execute on function public.staff_decide_case(uuid,text,text,text,uuid) to authenticated;
