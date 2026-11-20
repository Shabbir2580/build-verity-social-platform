# Verity

**Share freely. Think critically. Know more.**

Verity is a community-driven social platform designed to make sharing ideas and discussing information easier while giving people better context about the content they encounter.

The product is built around three distinct questions:

1. **Media origin:** Is content creator-declared as AI-generated or edited, or is its origin uncertain?
2. **Factual accuracy:** What evidence supports or contradicts a factual claim?
3. **Content intent:** Is a post news, education, opinion, satire, fiction, entertainment or something else?

These dimensions must remain separate. AI-generated content is not automatically misinformation, and an automated signal or label is not proof that a claim is true or false.

## Product areas

- Social feed for discussions, questions, news, memes and shared links
- User accounts and profiles
- Image and video posts
- Comments, reactions and bookmarks
- Interest-based communities
- Trust Center for content checks, labels, sources and review requests
- Standalone, consent-based text and image quick review with an experimental 0–100 human-review risk index and low/medium/high bands
- User reporting, moderation and appeals
- Support tickets
- Role-aware administration foundations

## Technology

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL, Row Level Security and Storage
- Vercel Analytics

## Local development

Requirements: Node.js compatible with the installed Next.js version and pnpm.

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create a local `.env.local` file with the Supabase project values:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   ```

   Optional server-only integrations (keep these out of client-side variables):

   ```env
   GEMINI_API_KEY=your_gemini_api_key
   VERITY_ADMIN_AI_ENABLED=false
   GEMINI_ADMIN_MODEL=gemini-3.5-flash-lite
   GOOGLE_FACT_CHECK_API_KEY=your_google_fact_check_tools_api_key
   ```

   Set `GEMINI_API_KEY` in the Vercel production environment to enable standalone AI text/image review and the existing post-assessment routes. Without it, Quick Review reports that the provider is unconfigured, disables AI submission and links users to source discovery; it never fabricates an AI result. Set `VERITY_ADMIN_AI_ENABLED=true` only after reviewing Gemini quotas and usage. The staff assistant defaults to `gemini-3.5-flash-lite`; optionally set `GEMINI_ADMIN_MODEL` to another model enabled for the same Google AI Studio project. A configured key does not guarantee model access or successful inference; provider errors are reported without generating a simulated answer. The Google Fact Check key is optional; without it, the Trust Center's published-review search remains unavailable. Restrict that key to the Fact Check Tools API and set conservative project quotas. Never commit any of these secrets.

   The application also accepts `NEXT_PUBLIC_SUPABASE_ANON_KEY` as a fallback. Never commit service-role keys or other secrets.

3. Start the development server:

   ```bash
   pnpm dev
   ```

4. Create a production build:

   ```bash
   pnpm build
   ```

5. Run the production smoke checks after building:

   ```bash
   pnpm smoke
   ```

   This starts the built app on port `3100` and checks key routes, HTML responses and required browser security headers.

## Database

Supabase migrations are stored in `supabase/migrations`. Review and apply migrations deliberately in the intended Supabase project. Do not assume that a migration committed to GitHub has already been applied to a live database.

## Verification status and product limitations

The Trust Center also offers a standalone Quick Content Review for signed-in users. It accepts text or JPG/PNG/WebP images up to 3 MB, requires explicit per-request consent before sending content to Google Gemini, and limits each account to five requests per hour. It returns an experimental 0–100 human-review risk index, mapped to the proposed PPT bands (0–30 low, 31–60 medium, 61–100 high), with observable signals, missing context and suggested checks. Text reviews can use Gemini Google Search grounding and display returned source links, statement-level source attributions and Google Search suggestions when available; if grounding is not returned, the UI explicitly marks the review as ungrounded. Image review is visual-only and does not use web grounding. The score is an uncalibrated AI triage index, not a probability, validated risk measurement, model accuracy or truth verdict; the proposed bands have not been evaluated against a labelled dataset. Image review is not forensic AI-generation or manipulation detection. The submitted content is not persisted by this endpoint; audit logs store only provider, request type and status. Text-review consent explains Google's 30-day grounding retention and warns users not to submit sensitive or confidential content. Grounded results and Search suggestions are displayed only to the requesting user and are not persisted by Verity.\n\nThe Trust Center has a live related-news discovery search powered by Google News RSS. It returns links to reporting that matches a query. This is source discovery only: search ranking is not evidence quality, the result is not a fact-check or truth verdict, and results are not written as persistent assessments.

The Trust Center now includes opt-in Gemini routes for a post author's own uploaded media and claim review. Both routes require an authenticated author, explicit per-request consent, usage limits, and server-side API/database credentials. Media assessment accepts JPG, PNG and WebP images up to 8 MB only; video assessment is outside the current project scope and is rejected by the API. It records `uncertain` in `content_checks` because Gemini's general multimodal reasoning is not forensic AI/deepfake detection and cannot establish provenance or authenticity. Claim review compares a claim with Google News RSS headlines only; it does not read full articles or establish truth, and it also records `uncertain`. The Gemini free tier may use submitted content to improve Google's products, so the UI discloses this and requires consent. These integrations must never be represented as proof or a definitive fact-check. An optional Google Fact Check Tools claim-search integration is available when `GOOGLE_FACT_CHECK_API_KEY` is configured. It returns third-party reviews already published by participating fact-check publishers; ratings remain the publishers' own wording, not Verity's verdict. It requires a Google API key and is not assumed to be free or enabled. The Trust Center asks for explicit consent, limits searches per account and does not store the search text in its usage log. Cryptographic C2PA manifest verification is still not integrated.

Verity's operating constraint is to avoid paid services, APIs, subscriptions and hidden billing. Some commercial media detectors offer free testing only or charge for production/video usage; do not enable them on a production route unless a genuinely no-cost plan with enforceable usage limits and appropriate production rights is confirmed. Open-source models need a suitable inference host and a licence that permits this use; Vercel serverless functions are not a free GPU inference service.

Structured Q&A, follows, notifications, support and moderation have user-facing workflows. Poll-voting tables exist in the database, but the current app has no poll composer or voting interface; polls are not a completed user-facing feature. Database tables alone do not mean a product feature is complete.

## Staff AI usage and reporting

The internal staff assistant is disabled by default and requires both `GEMINI_API_KEY` and `VERITY_ADMIN_AI_ENABLED=true`. Database-enforced per-account request limits are 12 per hour and 40 per 24 hours for the admin assistant, and 10 per hour for each support/moderation AI action; provider-side quotas remain the hard ceiling. Staff must explicitly consent before sending a question to Google; the UI warns them not to include names, private messages, credentials or personal data and discloses Google's free-tier data-use terms. Usage events are recorded in the existing admin audit log with model and token counts; prompt text is not stored. Token counts are not a currency-cost estimate. Provider billing and quota dashboards remain the source of truth for actual spend.

The admin Revenue & Impact workspace separates commercial enquiries and platform activity from recognized revenue. No payment processor or reconciled financial ledger is connected yet, so revenue, refunds, net revenue and profit are deliberately shown as unavailable. The future public impact report must use reviewed, privacy-safe aggregates and must never expose private financial records.

## Product principles

- Separate media origin, factual accuracy and content intent.
- Show sources and explain uncertainty.
- Keep human review and appeal paths available.
- Avoid presenting automated classifications as certainty.
- Protect user privacy and enforce access through server-side authorization and database policies.
- Prefer completing and testing existing workflows over duplicating them.
