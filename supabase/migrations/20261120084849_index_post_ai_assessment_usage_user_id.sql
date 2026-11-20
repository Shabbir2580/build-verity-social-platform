-- Cover the auth.users foreign key so user deletion does not require a full ledger scan.
create index if not exists post_ai_assessment_usage_user_id_idx
  on public.post_ai_assessment_usage (user_id);
