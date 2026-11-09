-- Add indexes for foreign-key columns that are not covered by an existing
-- leading-column index. This improves joins and parent-row delete/update checks.
-- No data is changed and existing indexes are left untouched.

create index if not exists answers_author_id_fk_idx on public.answers (author_id);
create index if not exists appeals_case_id_fk_idx on public.appeals (case_id);
create index if not exists appeals_label_id_fk_idx on public.appeals (label_id);
create index if not exists appeals_post_id_fk_idx on public.appeals (post_id);
create index if not exists appeals_prior_action_id_fk_idx on public.appeals (prior_action_id);
create index if not exists audit_logs_actor_id_fk_idx on public.audit_logs (actor_id);
create index if not exists blocks_blocked_id_fk_idx on public.blocks (blocked_id);
create index if not exists bookmarks_post_id_fk_idx on public.bookmarks (post_id);
create index if not exists comments_parent_id_fk_idx on public.comments (parent_id);
create index if not exists communities_creator_id_fk_idx on public.communities (creator_id);
create index if not exists moderation_actions_actor_id_fk_idx on public.moderation_actions (actor_id);
create index if not exists moderation_cases_assigned_to_fk_idx on public.moderation_cases (assigned_to);
create index if not exists moderation_cases_label_id_fk_idx on public.moderation_cases (label_id);
create index if not exists moderation_cases_opened_by_fk_idx on public.moderation_cases (opened_by);
create index if not exists moderation_cases_second_review_requested_by_fk_idx on public.moderation_cases (second_review_requested_by);
create index if not exists notifications_actor_id_fk_idx on public.notifications (actor_id);
create index if not exists poll_votes_user_id_fk_idx on public.poll_votes (user_id);
create index if not exists post_labels_created_by_fk_idx on public.post_labels (created_by);
create index if not exists post_labels_evidence_check_id_fk_idx on public.post_labels (evidence_check_id);
create index if not exists post_sources_added_by_fk_idx on public.post_sources (added_by);
create index if not exists question_links_created_by_fk_idx on public.question_links (created_by);
create index if not exists question_links_related_question_id_fk_idx on public.question_links (related_question_id);
create index if not exists question_votes_user_id_fk_idx on public.question_votes (user_id);
create index if not exists questions_accepted_answer_id_fk_idx on public.questions (accepted_answer_id);
create index if not exists questions_author_id_fk_idx on public.questions (author_id);
create index if not exists questions_community_id_fk_idx on public.questions (community_id);
create index if not exists reports_case_id_fk_idx on public.reports (case_id);
create index if not exists support_ticket_messages_author_id_fk_idx on public.support_ticket_messages (author_id);
create index if not exists support_tickets_assigned_to_fk_idx on public.support_tickets (assigned_to);
create index if not exists support_tickets_related_post_id_fk_idx on public.support_tickets (related_post_id);
