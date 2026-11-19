# Verity Monetization Strategy

## Current decision

Verity should validate demand before adding payment processing. The platform is still building its active community and trust workflows. The first release is an organization-pilot enquiry page, not a paid subscription product.

## Revenue options to validate

1. **Organization plans (first priority):** colleges, newsrooms, research groups and community organizations pay for team workspaces, onboarding, moderation workflows, reporting and administration. Scope and pricing should be agreed only after pilot interviews.
2. **Verity Pro (later):** optional user subscription for convenience features such as advanced saved searches, topic alerts, export tools and an ad-free interface. Core participation and safety tools stay free.
3. **Community memberships (later):** community owners may offer optional paid learning sessions or supporter memberships. Payments must be transparent and refunds/cancellations must be clear.
4. **Voluntary contributions (later):** one-time contributions to support infrastructure, with no effect on account status, reach, moderation or verification.
5. **Clearly labelled sponsorships (last):** limited sponsorships for educational events or community programmes. Sponsored content must be visibly labelled and excluded from trust labels, ranking signals and verification evidence.

## Non-negotiable trust boundaries

- Never sell verification outcomes, fact-check labels, human-review decisions, credibility badges or moderation priority.
- Never let sponsors influence evidence selection, moderation or ranking.
- Never disguise sponsored posts as ordinary community content.
- Do not sell personal data or use private posts, reports, messages or moderation records for ad targeting.
- Keep essential safety, appeals and account controls available without payment.
- Disclose all paid placements and commercial relationships.
- Make external AI analysis consent explicit and separate from any paid plan.

## Rollout sequence

### Stage 0 — Demand validation (now)
- Publish the organization pilot enquiry page.
- Collect use case, organization, role and contact details through the existing authenticated support-ticket workflow.
- Interview prospective pilot organizations before setting prices.
- Track enquiry count, qualified conversations, pilot conversion and requested features.

### Stage 1 — Paid organization pilots
- Offer a small number of manually scoped pilots only after the product can deliver the promised workflow.
- Define data access, retention, support, uptime expectations and success measures in writing.
- Do not build billing until at least a few organizations confirm willingness to pay.

### Stage 2 — Self-serve organization subscriptions
- Add role-based seats, organization workspaces, usage limits, invoices, cancellation and billing support.
- Choose a payment provider only after comparing fees, Indian tax requirements, refunds, chargebacks and recurring-payment rules.
- Add server-side entitlement checks; never trust client-only plan flags.

### Stage 3 — Individual and community monetization
- Test Pro and optional community memberships only if they solve a repeated user problem.
- Run pricing experiments transparently and measure retention, not just sign-ups.
- Keep core trust and safety functionality free.

## Metrics before launch

- Active users and 30-day retention
- Weekly active contributors
- Qualified organization enquiries and interview-to-pilot conversion
- Pilot usage and renewal intent
- Support workload and moderation capacity
- Gross margin after payment fees, infrastructure, provider usage and support time
- Refunds, cancellations and complaints

## Current implementation

- `/for-organizations` explains pilot use cases and collects authenticated organization enquiries.
- Enquiries use the existing `support_tickets` table with category `general`; no schema migration or payment provider was added.
- The page explicitly states that submitting an enquiry does not create a subscription or charge the user.
- No payment processing, ad targeting, sponsor placement or paid verification is implemented.
