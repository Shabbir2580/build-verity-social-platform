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

The Trust Center has a live related-news discovery search powered by Google News RSS. It returns links to reporting that matches a query. This is source discovery only: search ranking is not evidence quality, the result is not a fact-check or truth verdict, and results are not written as persistent assessments.

The Trust Center now includes opt-in Gemini routes for a post author's own uploaded media and claim review. Both routes require an authenticated author, explicit per-request consent, usage limits, and server-side API/database credentials. Media assessment accepts images up to 8 MB and short videos up to 20 MB; it records `uncertain` in `content_checks` because Gemini's general multimodal reasoning is not forensic AI/deepfake detection and cannot establish provenance or authenticity. Claim review compares a claim with Google News RSS headlines only; it does not read full articles or establish truth, and it also records `uncertain`. The Gemini free tier may use submitted content to improve Google's products, so the UI discloses this and requires consent. These integrations must never be represented as proof or a definitive fact-check. Dedicated fact-check claim-search and cryptographic C2PA manifest verification are still not integrated.

Verity's operating constraint is to avoid paid services, APIs, subscriptions and hidden billing. Some commercial media detectors offer free testing only or charge for production/video usage; do not enable them on a production route unless a genuinely no-cost plan with enforceable usage limits and appropriate production rights is confirmed. Open-source models need a suitable inference host and a licence that permits this use; Vercel serverless functions are not a free GPU inference service.

Several database foundations (including structured Q&A, polls, follows, notifications and staff workflows) are ahead of their user-facing interfaces. Database tables alone do not mean those product features are complete.

## Product principles

- Separate media origin, factual accuracy and content intent.
- Show sources and explain uncertainty.
- Keep human review and appeal paths available.
- Avoid presenting automated classifications as certainty.
- Protect user privacy and enforce access through server-side authorization and database policies.
- Prefer completing and testing existing workflows over duplicating them.
