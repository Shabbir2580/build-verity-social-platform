-- Audit records must only be written by trusted database workflows.
-- The client-facing RPC is unused by the application and lets any staff member
-- fabricate arbitrary action names/details (including admin-looking events).
revoke execute on function public.log_audit(text, text, text, jsonb)
  from public, anon, authenticated;
