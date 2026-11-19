# Verity Product Roadmap

This is the product backlog for Verity. Items marked **planned** are not implemented merely because they appear here. Existing functionality must be preserved unless a change is explicitly approved.

## Product principles

1. Evidence before verdicts. Never infer truth, authenticity, or AI generation from a general-purpose language model alone.
2. Accuracy and speed are equal product priorities. Return a fast preliminary status when appropriate, then update it as deeper checks finish.
3. Explain every result: method, evidence, sources, timestamp, uncertainty, and whether a human reviewed it.
4. Consent is optional and specific. Users can publish without sending their content to an external AI provider.
5. Human review, correction history, and appeals are part of the trust system.
6. Free-first implementation. Do not add paid APIs, paid infrastructure, or new recurring costs without explicit approval.
7. Preserve existing feed, account, community, moderation, support, and verification workflows.

## Phase 1 — Reliability and product audit

**Status: in progress**

- [ ] Test signup, login, logout, password reset, session expiry, and protected routes.
- [ ] Test feed loading, filtering, following, saved posts, search, and shared-post deep links.
- [ ] Test post creation, edit, author deletion, media upload, comments, reactions, bookmarks, and reporting.
- [ ] Test profiles, communities, membership, questions, notifications, support tickets, and staff workflows.
- [ ] Verify empty, loading, error, and retry states on every major page.
- [ ] Check mobile, tablet, and desktop layouts and keyboard accessibility.
- [ ] Check pagination ordering, large result sets, stale requests, duplicate submissions, and failure recovery.
- [ ] Record a reproducible bug list and prioritize user-blocking defects.

## Phase 2 — Admin and moderation control center

**Status: existing admin and moderation features; audit and improvement planned**

- [ ] Make admin entry points obvious for authorized administrators without exposing them to ordinary users.
- [ ] Create a clear admin overview for users, posts, reports, open cases, support tickets, verification activity, and operational health.
- [ ] Improve user management: search, role/status filters, suspension, restoration, and audit history.
- [ ] Improve post management: inspect, remove, restore where policy allows, and preserve moderation records.
- [ ] Improve moderation queue triage, reviewer assignment, due dates, escalation, and case history.
- [ ] Consolidate duplicate automated review cases only when case identity and evidence match safely.
- [ ] Support independent second review, appeals, and correction records.
- [ ] Ensure every privileged action has an audit record and clear confirmation.

## Phase 3 — Evidence-first verification

**Status: current Gemini assessments are limited and explicitly uncertain; deeper verification planned**

### Media origin and manipulation
- [ ] Keep creator AI disclosure separate from detector findings.
- [ ] Inspect available metadata and provenance credentials (including C2PA Content Credentials when present).
- [ ] Add specialist image-generation/manipulation detector integrations only when a genuinely free and suitable option is available and its limitations are documented.
- [ ] Add video frame sampling and temporal consistency analysis.
- [ ] Add audio inspection and speech/transcription analysis where technically and legally appropriate.
- [ ] Detect duplicate and near-duplicate media to reuse prior analysis carefully.
- [ ] Preserve original uploads and record transformations; do not treat missing metadata as proof of fakery.
- [ ] Report detector disagreement and inconclusive results rather than forcing a binary label.

### Claims, articles, and news
- [ ] Extract checkable claims from text, captions, and article pages.
- [ ] Retrieve full accessible articles rather than relying on headlines alone.
- [ ] Prefer primary sources, official records, original statements, research papers, and direct documents.
- [ ] Compare genuinely independent sources and identify repeated wire-copy or shared-source coverage.
- [ ] Record publication dates, retrieval dates, source URLs, relevant excerpts, and contradictions.
- [ ] Distinguish false, misleading, unsupported, disputed, outdated, satire, and not-yet-verifiable claims.
- [ ] Never treat search ranking, source popularity, or community votes as proof.
- [ ] Provide an explicit no-result state; absence of fact-check coverage is not confirmation.

### Verification report
- [ ] Show the exact claim or media item assessed.
- [ ] Show methods and providers used, evidence for and against, sources, timestamps, limitations, and confidence calibration.
- [ ] Distinguish automated assessment from human-reviewed decision.
- [ ] Keep a versioned history when evidence or labels change.
- [ ] Allow users to challenge a result and attach evidence.

## Phase 4 — Fast and resilient processing

**Status: planned**

- [ ] Introduce a persistent verification-job lifecycle: queued, processing, completed, failed, and cancelled.
- [ ] Move long-running analysis out of the post-publish request path.
- [ ] Show live progress and let users leave the page while jobs continue.
- [ ] Run independent checks concurrently with bounded concurrency and provider timeouts.
- [ ] Add retries with backoff for transient errors, while avoiding duplicate charges or duplicate cases.
- [ ] Cache reusable results by content fingerprint, method version, and provider version.
- [ ] Invalidate or refresh cached results when methods, models, or evidence materially change.
- [ ] Add safe deduplication and idempotency for repeated submissions.
- [ ] Track p50/p95 processing times, failure rates, queue age, and provider availability.

## Phase 5 — Trust, transparency, and user recourse

**Status: partial foundation exists; expansion planned**

- [ ] Publicly readable verification reports with source links and clear uncertainty.
- [ ] Separate labels for creator declaration, automated signal, source evidence, and human decision.
- [ ] Public correction and retraction history.
- [ ] Appeal status tracking and reviewer decisions.
- [ ] Community evidence notes that can add context but cannot decide truth by popularity.
- [ ] Report status tracking and clear moderation explanations.
- [ ] Verified source/publisher profiles with transparent criteria; no pay-to-verify.
- [ ] User-facing explanation of how labels are created and what they do not mean.

## Phase 6 — Social and discovery improvements

**Status: existing core social features; expansion planned**

- [ ] Better search across posts, people, communities, and topics.
- [ ] Hashtags, topic pages, and followed topics.
- [ ] Trending discussions and claims with transparent ranking signals.
- [ ] Community groups, topic discovery, and better community moderation tools.
- [ ] Better personalized feeds without confusing popularity with credibility.
- [ ] Notifications for replies, mentions, follows, moderation updates, and verification changes.
- [ ] Saved posts and saved verification reports.
- [ ] Rich profiles and public contribution history.
- [ ] Accessible media captions, alt text, and upload guidance.
- [ ] Spam, harassment, impersonation, and coordinated-abuse reporting workflows.

## Phase 7 — Visual design and experience

**Status: existing branded UI; systematic redesign planned**

- [ ] Establish one coherent design system for feed, Trust Center, profiles, communities, questions, admin, and moderation.
- [ ] Create a distinctive, polished, eye-catching identity with strong visual hierarchy and restrained gradients.
- [ ] Improve typography, spacing, card density, alignment, icon consistency, and readable content widths.
- [ ] Use accessible contrast and semantic colors; never rely on color alone for a verification state.
- [ ] Improve upload, verification progress, report, and moderation result visualizations.
- [ ] Add consistent skeletons, empty states, error states, confirmations, and toast feedback.
- [ ] Make mobile navigation, post composer, media preview, and action controls intuitive.
- [ ] Add a consistent dark theme only after all hard-coded light styles are audited.
- [ ] Respect reduced-motion settings; animations must be subtle and never block reading.
- [ ] Test keyboard focus, screen-reader labels, touch target sizes, zoom, and responsive breakpoints.

## Phase 8 — Security, privacy, and production readiness

**Status: ongoing hardening; full readiness review planned**

- [ ] Review Supabase RLS and server-side authorization for every user/staff/admin operation.
- [ ] Review upload MIME/signature checks, size limits, storage access, orphan cleanup, and retention rules.
- [ ] Add abuse-resistant per-user and global rate limits where appropriate.
- [ ] Avoid leaking provider keys, private records, or internal moderation notes.
- [ ] Add operational error reporting and health indicators without exposing private content.
- [ ] Review database indexes, query plans, pagination, and high-cardinality feeds.
- [ ] Test backup and recovery procedures.
- [ ] Run load tests and browser-based end-to-end tests.
- [ ] Confirm privacy disclosures, retention, consent, and provider data-use terms.
- [ ] Complete a release checklist and verify the actual production deployment separately from CI.

## Quality gates

These are target acceptance criteria, not claims about current performance:

- 100% of critical user journeys pass automated end-to-end tests.
- 100% of privileged-action authorization tests pass.
- No unexpected errors in the agreed smoke-test suite.
- Every published verification report states its method, evidence coverage, timestamp, and limitations.
- No automated system may convert an inconclusive assessment into a confirmed truth or AI-generation verdict.
- Every human decision and administrative action is auditable.
- Measure p50 and p95 latency; initial targets are under 1 second for cached report retrieval and under 10 seconds for a preliminary automated assessment where the provider supports it.
- Track precision, recall, and false-positive rates on a labelled test dataset; do not use aggregate accuracy alone.
- Verify the app at mobile, tablet, and desktop breakpoints.
- CI passing is not the same as a production deployment.

## Current implementation notes

- The current media and claim checks use Gemini as a general-purpose multimodal/language model. They are not forensic AI/deepfake detection or definitive fact-checking.
- Current claim assessment has relied on Google News headlines rather than full article review; this is insufficient for a factual verdict.
- The current Trust Center displays stored checks and allows human-review requests.
- Admin, moderation, support, feed, profile, community, notification, and post-management routes already exist and should be audited before adding replacements.
- No paid provider or additional paid infrastructure is approved by this roadmap.
