-- Trigger functions are invoked by their owning triggers, not through PostgREST RPC.
-- Remove direct client EXECUTE grants while leaving trigger execution intact.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_profile_update() from public, anon, authenticated;
revoke execute on function public.on_follow() from public, anon, authenticated;
revoke execute on function public.on_community_created() from public, anon, authenticated;
revoke execute on function public.on_community_join() from public, anon, authenticated;
revoke execute on function public.guard_post_update() from public, anon, authenticated;
revoke execute on function public.notify_mentions(text, uuid, text) from public, anon, authenticated;
revoke execute on function public.on_post_created() from public, anon, authenticated;
revoke execute on function public.on_comment_created() from public, anon, authenticated;
revoke execute on function public.guard_question_update() from public, anon, authenticated;
revoke execute on function public.guard_answer_update() from public, anon, authenticated;
revoke execute on function public.on_answer_created() from public, anon, authenticated;
revoke execute on function public.on_report_created() from public, anon, authenticated;
revoke execute on function public.on_appeal_created() from public, anon, authenticated;
revoke execute on function public.on_ticket_created() from public, anon, authenticated;
revoke execute on function public.on_ticket_updated() from public, anon, authenticated;
revoke execute on function public.on_ticket_message() from public, anon, authenticated;

-- Internal notification dispatch is only called from trusted database functions.
revoke execute on function public.notify_user(uuid, uuid, text, text, text, text) from public, anon, authenticated;
