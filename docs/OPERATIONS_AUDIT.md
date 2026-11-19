# Verity operations audit

Audit date: 2026-11-19  
Repository branch: `main`  
Supabase project: `Verity`  
Database engine: PostgreSQL 17

## Migration alignment

The live Supabase migration history was compared with the migration files in this repository. The author post-removal migration was already applied in the live project as version `20261119113145`, while the repository had the same migration contents under a later timestamp. The repository file has been renamed to match the applied version so a future migration push does not treat the same change as new work.

The live function definition for `public.guard_post_update()` matches the repository migration. No database migration was applied during this audit.

## Supabase advisor results

### Security

- The advisor reports one anonymous-execution warning for `public.is_moderator()`. Public SELECT policies on posts, questions and answers call this helper. The function returns false when `auth.uid()` is null; revoking anonymous execution without rewriting those public policies could break anonymous reads. Treat this as an intentional helper exception, not as a blanket reason to expose other privileged functions.
- The advisor reports authenticated execution warnings for security-definer helpers and staff/admin RPCs. The inspected privileged functions include explicit `is_admin()` or `is_moderator()` checks inside the function body. These functions are intentionally callable by authenticated clients, with authorization enforced inside the database function. Do not remove their execute grants without replacing the corresponding UI/RPC flows and policy design.
- Supabase Auth leaked-password protection is disabled. This is an Auth project setting, not a repository migration. It remains a manual dashboard action; it was not changed during this work.

### Performance

- The advisor reports 51 unused indexes. The project is early in its usage lifecycle, so an index being unused is not enough evidence to drop it. Review query plans and real workload after meaningful traffic exists before removing indexes.

### Health

- No health advisor findings were returned at the time of this audit.

## Application AI controls

- Staff AI requests are recorded in `audit_logs` without storing the question text.
- Gemini system rules are sent through the provider's separate `systemInstruction` field; the staff question and aggregate snapshot remain in the user-content field. This improves instruction separation but is not a substitute for prompt-injection testing.
- Model and token usage metadata are recorded when Gemini returns it. Token counts are not a currency-cost calculation.
- Per-account hourly and daily request caps are best-effort application controls. They are not a substitute for hard provider-side quotas, which must be configured in the Google AI project.
- Staff must consent before sending a question to Google Gemini and are instructed not to include personal data, credentials or private messages.
- The Google Fact Check Tools integration requires a server-only API key, explicit user consent and account-level request limits. The key should be restricted to that API and protected with conservative quotas.

### Role-scoped AI data

- The assistant currently uses aggregate metrics only; it does not retrieve individual moderation cases or support conversations.
- Its database client uses a service-role key and therefore bypasses RLS. Role checks and query filters must be enforced explicitly in every server-side data path.
- Support-role AI metrics now explicitly filter tickets to `assigned_team = 'support'`. Admin metrics retain the cross-team overview. This prevents support staff from receiving Trust & Safety queue counts through the assistant.
- Any future case/ticket copilot must verify the requested record belongs to the staff member's permitted team before retrieval, require separate explicit consent before sending member-submitted content to an external model, and return source references. Do not pass private conversations to Gemini by default.

## Operational boundaries

- This audit used read-only database inspection and Supabase advisor calls. No live schema, Auth setting, billing setting or project configuration was changed.
- No production deployment was performed.
- Public impact metrics remain unpublished. Current activity is too small for a meaningful public showcase; wait for reviewed aggregates and minimum cohort thresholds so reports cannot expose individual activity.
- Never drop indexes or revoke helper-function grants solely to clear advisor warnings. First prove that the change preserves the relevant RLS policies and user-facing workflows.
