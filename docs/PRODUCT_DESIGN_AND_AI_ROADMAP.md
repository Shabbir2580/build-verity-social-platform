# Verity product design and AI roadmap

Last reviewed: 2026-11-19

## Product direction

Verity should feel like a credible, calm trust-and-discussion product: editorial reading experience for members, evidence-first workflows for trust and safety, and an operational workspace for staff. It should not look like a generic social template, a neon AI demo, or a collection of unrelated dashboards.

## Visual system

### Colour roles

Use a restrained 60/30/10 system rather than applying every accent everywhere.

| Role | Token / value | Use |
| --- | --- | --- |
| Primary ink | `#202B3A` | Headlines, body text, primary navigation |
| Brand navy | `#17263C` | Brand anchors, high-trust headers |
| Action blue | `#405A91` | Primary actions, links, selected navigation |
| Trust teal | `#247A78` | Evidence, provenance, confirmed progress |
| Warm highlight | `#C58A4A` | Important insight, attention, premium details |
| Warm paper | `#F6F5F1` | Page background |
| Surface | `#FFFFFF` | Cards, dialogs, forms |
| Stone border | `#E5E3DD` | Dividers and card edges |
| Muted text | `#697586` | Secondary labels and helper text |

Semantic colours are reserved: green for success, amber for caution/overdue attention, red for destructive or critical states. Do not use red/green as brand decoration. Maintain WCAG AA contrast for text and controls. Avoid animated gradients, glow effects and excessive rounded cards.

### Design principles

- Clear page title, one-sentence purpose, primary action, then content.
- One spacing scale and a small radius scale; consistent card and form anatomy.
- Typography hierarchy: page title, section title, item title, body, metadata.
- Data must be labelled with scope and time window; never imply a count is a trend.
- Every data surface needs loading, empty, error and permission-denied states.
- Destructive actions need confirmation, reason where appropriate, and audit feedback.
- Mobile layouts must be intentionally composed; tables become cards or controlled horizontal regions.
- Keyboard focus, reduced motion, semantic landmarks, accessible names and touch target sizes are release requirements.

## Surface-by-surface design plan

| Surface | Target experience | Required audit |
| --- | --- | --- |
| Home/feed | Editorial feed with strong reading rhythm, meaningful post actions and visible evidence context | Header, feed width, post metadata, media crops, comments, empty/loading/error, responsive sidebar |
| Explore/search | Search-first discovery with filter chips, result grouping and useful no-result recovery | Query behaviour, filters, sorting, result cards, keyboard interaction |
| People | Profile discovery with concise identity, interests and follow state | Search, follow/unfollow, loading and empty states |
| Member profile | Clear identity and contribution history without implying popularity equals credibility | Cover/avatar, bio, activity, follow state, privacy boundaries |
| Communities | Strong community identity and readable discussion list | Membership state, rules, moderators, activity and empty states |
| Questions | Question-first layout with answer quality and accepted-answer clarity | Answer ordering, accepted answer, unresolved state, mobile reading |
| Notifications | Grouped activity with clear read/unread hierarchy and bulk actions | Mark read, deep links, no-notification state, pagination |
| Verification centre | Separate media-origin, manipulation, factual claim, source and provenance evidence | Evidence provenance, dates, uncertainty, provider state, appeal flow |
| Member settings/auth | Calm, accessible account and security flows | Validation, recovery, session state, errors, consent |
| Support | Clear member ticket creation and conversation history | Status, response expectations, attachments, privacy |
| Staff support queue | Queue + selected ticket workspace, with ownership and SLA visibility | Assignment, internal notes, response draft, escalation, mobile |
| Moderation | Case queue with evidence timeline and human decision controls | Priority, due date, policy basis, reviewer, appeal, audit trail |
| Admin overview | Executive operations dashboard with actionable metrics and quick links | Scope labels, trends, permissions, freshness, no fake revenue |
| Admin people/posts | Searchable management tools with safe actions | Pagination, role/suspension safeguards, moderation history |
| Business workspace | Lead pipeline separated from financial ledger | Follow-up owner, due dates, status, conversion; never label leads as revenue |
| Revenue & impact | Private reconciled financial reporting; public privacy-safe impact aggregates | Settlements, refunds, fees, expenses, attribution, minimum cohort thresholds |
| AI workspaces | Distinct admin, moderator and support copilots | Role scope, evidence, action boundaries, consent, cost, logging |

## AI capability plan

### Current baseline (honest limitations)

The staff assistant is grounded in a curated Verity product and operations handbook plus role-specific guidance and live aggregate counts. It can explain shipped features, staff workspaces, safe workflows and the limits of current capabilities. The general admin/staff copilot still does not read individual moderation cases or support tickets, inspect private content, execute staff actions, or connect to a verified revenue ledger. Selected-case moderation summaries and selected-ticket support drafts are separate, consent-based workflows with their own authorization checks.

Gemini's media analysis is a general multimodal description workflow, not a forensic AI/deepfake detector. Automated video-origin review is not implemented. News discovery and third-party fact-check search are separate evidence sources. None should be collapsed into a single true/false or fake/real score.

### Phase A — task-specific aggregate copilot

- Add explicit modes: daily briefing, priority ranking, growth interpretation, workflow guidance and free-form question.
- Require each observation to quote the exact metric and snapshot time.
- Separate observed facts, interpretation, suggested next steps and data limitations.
- Never describe one 7-day total as a trend without a comparison period.
- Keep the provider disabled unless server configuration and usage/cost controls are approved.

### Phase B — role-scoped record retrieval

- Admin: aggregate health, business pipeline and selected administrative records.
- Moderator: only assigned/authorised moderation cases, reports, policy references and linked evidence metadata.
- Support: only authorised support tickets and conversation records required to answer the selected ticket.
- Retrieve only the minimum records needed for a specific user-selected task.
- Return record references and timestamps so staff can open the source of every recommendation.
- Exclude credentials, secrets and unrelated personal data; do not send whole tables or conversation histories to the model.

### Phase C — workflow copilot

- Summarise a selected case/ticket.
- Build a timeline from stored events.
- Draft a member response or internal note for staff review.
- Suggest relevant policy sections and missing evidence.
- Prepare an escalation or follow-up checklist.
- Require staff confirmation before any write action; log actor, target, reason and outcome.
- No autonomous suspension, deletion, case closure, appeal decision, or truth verdict.

### Phase D — verification intelligence

- Separate provenance/C2PA, AI-origin detector outputs, manipulation signals, visual observations and factual claim checks.
- Evaluate candidate specialist providers against a labelled test set before production use.
- Measure false positives/negatives by media type and language; show provider/version, date, evidence and uncertainty.
- Preserve original media and chain-of-custody metadata; do not infer authenticity from style alone.
- Human review and appeals remain available.

### Phase E — business intelligence

- Build a reconciled ledger for payment captures, settlements, refunds, fees, taxes and expenses.
- Separate lead pipeline, booked contract value, collected cash, net revenue and profit.
- Only then enable earnings analysis, attribution and scenario forecasts.
- Public impact reports use approved aggregates, privacy thresholds and clear definitions.

## Delivery sequence and acceptance criteria

1. **Design foundation:** unify colour tokens, typography, spacing, surfaces, navigation and responsive breakpoints. Acceptance: no contradictory CSS overrides; shared components look consistent.
2. **Member experience:** home, search, profile, people, communities, questions, notifications, auth and settings. Acceptance: every surface has loading/empty/error states and passes desktop/tablet/mobile checks.
3. **Trust experience:** verification centre, evidence timeline, review requests and policy context. Acceptance: every provider output is labelled by source and limitation; no unsupported binary verdicts.
4. **Staff operations:** support queue and moderation case workspace. Acceptance: role checks are server-side; actions have confirmation, audit history and clear outcomes.
5. **AI copilots:** task-specific aggregate assistant, then role-scoped record retrieval, then human-approved drafting. Acceptance: source references, scope limits, provider usage tracking, prompt-injection tests and no autonomous consequential actions.
6. **Admin and commercial reporting:** operations overview, people/posts management, business pipeline and verified ledger. Acceptance: data freshness and definitions visible; no leads presented as earnings.
7. **Release quality:** automated route/security checks, unit tests for critical logic, accessibility review, visual regression screenshots and manual mobile QA. Acceptance: CI passes and a production deployment is verified before calling a feature live.

## Release discipline

- Work directly on `main` only after inspecting the current implementation.
- Preserve existing behaviour and avoid duplicate systems.
- Batch related file changes where possible so CI is not needlessly cancelled.
- Do not apply database migrations or add paid providers/branches without an explicit, reviewed need.
- Never claim a feature is deployed until the production deployment SHA matches the tested commit.
