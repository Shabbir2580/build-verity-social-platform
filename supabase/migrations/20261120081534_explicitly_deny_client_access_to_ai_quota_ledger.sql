-- Explicitly document that the quota ledger is inaccessible to client roles.
drop policy if exists post_ai_assessment_usage_deny_client on public.post_ai_assessment_usage;
create policy post_ai_assessment_usage_deny_client
on public.post_ai_assessment_usage
for all
to anon, authenticated
using (false)
with check (false);
