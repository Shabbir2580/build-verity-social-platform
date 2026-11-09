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

The current Trust Center reads assessment, label, source and review-request records already stored in Supabase. A live AI-media detection provider and live fact-checking/search provider are not yet integrated. Do not present those checks as active until the providers, server-side orchestration, evidence handling and failure/uncertainty states are implemented and tested.

Several database foundations (including structured Q&A, polls, follows, notifications and staff workflows) are ahead of their user-facing interfaces. Database tables alone do not mean those product features are complete.

## Product principles

- Separate media origin, factual accuracy and content intent.
- Show sources and explain uncertainty.
- Keep human review and appeal paths available.
- Avoid presenting automated classifications as certainty.
- Protect user privacy and enforce access through server-side authorization and database policies.
- Prefer completing and testing existing workflows over duplicating them.
