# Verity product and engineering roadmap

Last reviewed: 2026-11-19  
Target branch: `main`  
Design direction: enterprise — restrained navy, white, slate and indigo; accessible contrast; responsive layouts.

## Operating rules

- Preserve existing social, account, community, moderation, support and verification workflows.
- Inspect the current implementation and database before adding routes, tables, policies or components.
- Reuse existing Supabase structures where they fit; do not create duplicate dashboards or ledgers.
- Keep the project on its no-additional-cost constraint. Do not enable paid APIs or services without an explicit budget decision.
- Never deploy or change production infrastructure without explicit authorization.
- Treat AI as decision support. Humans retain moderation, account, appeal, financial and publication decisions.
- Separate media origin, media manipulation, factual accuracy and content intent. An AI-generated image is not automatically false; an authentic image can be used with a false claim.
- Never turn leads, proposed budgets, pipeline value, model estimates or un-settled payments into recognized revenue.

## Delivery phases

### Phase 1 — Admin reporting foundation
Status: **in progress**
- Add a private Revenue & Impact workspace.
- Separate financial reporting, commercial pipeline and platform activity.
- Show unavailable financial measures as unavailable until a verified ledger exists.
- Add an admin dashboard entry point.
- Verify role authorization, API contracts, TypeScript, production build and route smoke tests.

### Phase 2 — Enterprise design system and navigation
- Audit all public, member, staff and admin routes for inconsistent spacing, typography, cards, navigation and mobile behavior.
- Replace conflicting one-off visual overrides with documented design tokens and reusable patterns in small, testable steps.
- Standardize page headers, breadcrumbs, buttons, form controls, tables, empty states, loading states, alerts and confirmation dialogs.
- Prioritize feed, post detail, Trust Center, moderation, support, admin and organization pages.
- Test keyboard navigation, visible focus, reduced motion, responsive breakpoints and contrast.

### Phase 3 — Admin and staff operating workspace
- Make role-specific entry points explicit for admin, moderator and support staff.
- Surface assigned work, urgent cases, overdue deadlines, unresolved tickets and follow-up queues.
- Improve search, filters, assignment context, escalation and audit history.
- Keep privileged actions server-authorized and auditable; require reasons and confirmation for sensitive actions.

### Phase 4 — Verity AI operations assistant
- Improve the existing read-only staff assistant rather than create a duplicate.
- Provide role-scoped daily briefings, workload summaries, trend explanations and suggested next steps.
- Add durable request limits, usage/cost observability and safe provider configuration before broad enablement.
- Treat user prompts and retrieved content as untrusted input.
- AI may draft and summarize; it must not autonomously ban users, remove content, decide appeals, publish reports or approve payments.

### Phase 5 — Trust and verification quality
- Audit current media and claim flows end-to-end, including consent, ownership, upload limits, storage, status, human review and UI labels.
- Keep separate result dimensions: media origin, manipulation indicators, claim evidence and content intent.
- Integrate an actual media-origin/deepfake detector only after confirming model capability, licensing, privacy terms, hosting and enforceable no-cost limits.
- Do not describe general-purpose multimodal reasoning or news headline search as forensic detection or fact-checking.
- Add source quality, publication dates, primary-source links, conflicting evidence, uncertainty and human review history.
- Provide clear correction and appeal paths.

### Phase 6 — Commercial foundations
- Formalize organization plans, sponsor enquiries, campaign proposals and partnership workflow.
- Keep all sponsorship placements clearly labelled and separate from organic ranking, verification and moderation.
- Add campaign management only after inventory, contracts, approvals, disclosure and reporting rules exist.
- Do not sell private user data or sell verification outcomes.

### Phase 7 — Financial ledger and revenue intelligence
- Select a payment provider only after reviewing fees, settlement support, refunds, tax handling, webhooks, documentation and no-cost constraints.
- Build a reconciled transaction ledger with payment captures, settlement status, refunds, provider fees, taxes, invoices and expenses.
- Distinguish gross sales, collected cash, settled funds, refunds, net revenue, expenses and profit.
- Make webhook processing idempotent and reconcile provider records against ledger entries.
- Add AI summaries and forecasts only from verified ledger data; label estimates and assumptions.
- Never infer earnings from business enquiry budgets or campaign proposals.

### Phase 8 — Public impact reporting
- Publish a separate, reviewed public report using privacy-safe aggregates.
- Include transparent definitions, time windows, methodology and caveats for every metric.
- Exclude personal data, private financials, unreviewed AI assessments and small cohorts that could identify individuals.
- Require an admin review before publication and preserve report versions.

### Phase 9 — Reliability and release readiness
- Run TypeScript, production build, smoke tests and targeted workflow checks after each coherent change.
- Verify role boundaries, RLS, API authorization, error handling, loading states and mobile behavior.
- Review accessibility, performance, logging, retention and provider costs.
- Deployment remains a separate step and requires explicit authorization.

## Current verified implementation notes

- Existing admin dashboard includes member/role management, post management, platform activity and an audit log.
- Existing staff AI assistant provides aggregate operational context and is gated by server environment configuration.
- Existing organization enquiries are stored as support tickets; they are pipeline records, not revenue.
- Existing media and claim Gemini routes explicitly record uncertainty and do not establish AI provenance, deepfake authenticity or truth.
- Existing Google News RSS endpoint provides related headlines only; headlines are not evidence sufficient for a truth verdict.
- No payment processor or financial ledger is currently connected to the business dashboard.
- Database migrations are committed to the repository but are not assumed to be applied to the live Supabase project.

## Completion rule

A phase is complete only when the feature exists in the repository, its permissions and data sources are verified, its UI is reachable, automated checks pass, and its limitations are documented. A committed migration is not considered live until separately applied and verified. A successful build is not a substitute for end-to-end workflow validation.
