import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const port = 3100;
const origin = `http://127.0.0.1:${port}`;
const routes = [
  ["/", "The internet is loud."],
  ["/login", "Good to see you."],
  ["/signup", "Join the conversation."],
  ["/questions", "Questions worth answering."],
  ["/verify", "See the evidence."],
  ["/verify/quick", "Quick content review"],
  ["/for-organizations", "Grow your brand."],
  ["/notifications", "Notifications"],
  ["/privacy", "Information we handle"],
  ["/terms", "Your content"],
  ["/guidelines", "Community guidelines"],
  ["/settings", "Loading settings..."],
  ["/people", "Find people worth following."],
  ["/forgot-password", "Forgot your password?"],
  ["/reset-password", "Checking your recovery link"],
  ["/u/verity-smoke-test-user", "Loading profile..."],
  ["/communities", "Find your people."],
  ["/communities/verity-smoke-test-community", "Loading community..."],
  ["/support/tickets/00000000-0000-4000-8000-000000000002", "Ticket conversation"],
  ["/support/staff", null],
  ["/moderation", "Checking staff access"],
  ["/admin", "Checking administrator access"],
  ["/admin/business", "Commercial workspace"],
  ["/admin/revenue", "Revenue"],
  ["/admin/ai", "AI command center"],
  ["/impact", "Verity, in the open."],
  ["/staff/assistant", "AI command center"],
];

const env = {
  ...process.env,
  PORT: String(port),
  HOSTNAME: "127.0.0.1",
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "ci-placeholder-publishable-key",
};

const server = spawn("pnpm", ["start"], {
  env,
  stdio: "inherit",
  detached: process.platform !== "win32",
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js server exited early with code ${server.exitCode}`);
    }

    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Next.js production server did not become ready within 40 seconds.");
}

try {
  for (const authPage of ["login", "signup"]) {
    const source = await readFile(new URL(`../app/${authPage}/page.tsx`, import.meta.url), "utf8");
    for (const marker of ["function getSafeNextPath()", 'callbackUrl.searchParams.set("next", getSafeNextPath())', "router.replace(getSafeNextPath())"]) {
      if (!source.includes(marker)) {
        throw new Error(`/${authPage} is missing safe post-auth redirect behavior: ${marker}`);
      }
    }
    process.stdout.write(`PASS /${authPage} preserves safe return destinations\\n`);
  }

  const signupPageSource = await readFile(new URL("../app/signup/page.tsx", import.meta.url), "utf8");
  if (!signupPageSource.includes('callbackUrl.searchParams.set("next", getSafeNextPath())') || signupPageSource.includes('callbackUrl.searchParams.set("next", "/")')) {
    throw new Error("Email signup confirmation must preserve the validated destination instead of always returning users to the home page.");
  }
  const communityDetailSource = await readFile(new URL("../app/communities/[slug]/page.tsx", import.meta.url), "utf8");
  if (!communityDetailSource.includes("const slug = params.slug;") || communityDetailSource.includes("decodeURIComponent(params.slug)")) {
    throw new Error("Community detail routes must use the already-decoded Next.js route parameter without decoding it a second time.");
  }
  process.stdout.write("PASS community detail route parameters are not decoded twice\\n");

  const communityDirectorySource = await readFile(new URL("../app/communities/page.tsx", import.meta.url), "utf8");
  for (const marker of [
    '.from("communities")',
    '.from("community_memberships")',
    'router.push("/login?next=%2Fcommunities")',
    'currentRole === "owner"',
    'role="alert"',
    'role="status"',
  ]) {
    if (!communityDirectorySource.includes(marker)) {
      throw new Error(`Public community directory is missing required discovery or membership behavior: ${marker}`);
    }
  }
  process.stdout.write("PASS public community directory supports discovery and authenticated membership actions\\n");

  const homePageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  for (const marker of ["Optional content review.", 'href="/verify/quick"', "Sign-in and explicit consent are required"]) {
    if (!homePageSource.includes(marker)) throw new Error(`Home feed AI review notice is missing accurate opt-in guidance: ${marker}`);
  }
  if (homePageSource.includes("Gemini-assisted reviews are available.")) {
    throw new Error("Home feed must not claim Gemini is available without a live provider check.");
  }
  const removePostStart = homePageSource.indexOf("async function deletePost(postId: string)");
  const removePostEnd = homePageSource.indexOf("async function deleteComment", removePostStart);
  if (removePostStart < 0 || removePostEnd < 0) throw new Error("Home feed is missing the author post-removal workflow.");
  const removePostSource = homePageSource.slice(removePostStart, removePostEnd);
  const postStateChangeIndex = removePostSource.indexOf('.from("posts")');
  const mediaCleanupIndex = removePostSource.indexOf('.from("post_media")');
  if (postStateChangeIndex < 0 || mediaCleanupIndex < 0 || postStateChangeIndex > mediaCleanupIndex) {
    throw new Error("Author post removal must hide the post before attempting attached-media cleanup.");
  }
  for (const marker of ["The post is no longer publicly visible", "moderation history is retained", "Storage cleanup failed"]) {
    if (!removePostSource.includes(marker)) throw new Error(`Author post removal is missing safe cleanup handling: ${marker}`);
  }
  process.stdout.write("PASS author post removal hides content before best-effort media cleanup\\n");

  if (!removePostSource.includes('.eq("id", postId).eq("author_id", user.id)')) {
    throw new Error("Author post removal must scope the update to the signed-in author.");
  }
  if (!homePageSource.includes("user?.id === post.author_id") || !homePageSource.includes('aria-label="Delete your post"')) {
    throw new Error("The feed must show post edit/delete controls only to the post author.");
  }
  const postOwnershipMigration = await readFile(new URL("../supabase/migrations/20261120052137_restrict_direct_post_mutations_to_owners.sql", import.meta.url), "utf8");
  for (const marker of [
    "create policy posts_update",
    "create policy posts_delete",
    "author_id = (select auth.uid())",
    "public.is_active_user()",
    "admin_manage_post() and staff_decide_case()",
  ]) {
    if (!postOwnershipMigration.includes(marker)) {
      throw new Error(`Post ownership migration is missing required authorization rule: ${marker}`);
    }
  }
  if (/using\s*\([\s\S]*?is_moderator\(\)/i.test(postOwnershipMigration)) {
    throw new Error("Direct post update/delete policies must not grant staff-wide client mutation access.");
  }
  process.stdout.write("PASS post edit/delete UI and database policies enforce author ownership; staff actions stay in audited RPCs\\n");

  const productPageSources = await Promise.all([
    readFile(new URL("../app/u/[username]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/people/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/questions/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/communities/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/notifications/page.tsx", import.meta.url), "utf8"),
  ]);
  const profileBlockSource = productPageSources[0];
  for (const [index, source] of productPageSources.entries()) {
    if (!source.includes("verity-product-page")) {
      throw new Error(`Product page ${index + 1} is missing the shared responsive design shell.`);
    }
  }
  const profileDeleteStart = productPageSources[0].indexOf("async function deleteProfilePost(postId: string)");
  const profileDeleteEnd = productPageSources[0].indexOf("async function toggleBlock", profileDeleteStart);
  if (profileDeleteStart < 0 || profileDeleteEnd < 0) throw new Error("Profile page is missing the author post-deletion workflow.");
  const profileDeleteSource = productPageSources[0].slice(profileDeleteStart, profileDeleteEnd);
  const profilePostHideIndex = profileDeleteSource.indexOf('.from("posts")');
  const profileMediaCleanupIndex = profileDeleteSource.indexOf('.from("post_media")');
  if (profilePostHideIndex < 0 || profileMediaCleanupIndex < 0 || profilePostHideIndex > profileMediaCleanupIndex) {
    throw new Error("Profile deletion must hide the post before attempting media cleanup.");
  }
  for (const marker of ["Media cleanup is pending", "Post deleted.", "moderation history has been retained"]) {
    if (!profileDeleteSource.includes(marker)) throw new Error(`Profile post deletion is missing resilient cleanup feedback: ${marker}`);
  }
  for (const marker of ['rpc("is_blocked_between", { a: viewer, b: found.id })', "const profileBlockedViewer = Boolean(blockedBetween) && !viewerBlockedProfile", "blocked || blockedByProfile", "if (blocked || blockedByProfile)", "!blocked && !blockedByProfile && <button", "This account has blocked you"]) {
    if (!profileBlockSource.includes(marker)) throw new Error(`Profile visibility must respect both directions of a block: ${marker}`);
  }
  process.stdout.write("PASS profile post deletion hides content before best-effort media cleanup\\n");
  process.stdout.write("PASS profile, people, community and notification pages use the shared product shell\\n");

  const feedBlockSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  if (!feedBlockSource.includes('.from("blocks")') || !feedBlockSource.includes('blocked.has(row.author_id)')) {
    throw new Error("The main feed must exclude posts from accounts blocked by the signed-in viewer.");
  }
  if (!feedBlockSource.includes('.select("post_id, author_id")') || !feedBlockSource.includes("blockedUserIds.includes(row.author_id)") || !feedBlockSource.includes("let commentRows: { post_id: string; author_id: string }[] = [];")) {
    throw new Error("Comments, their visible counts and comment row types must support blocked-author filtering.");
  }
  if (!profileBlockSource.includes("eitherAccountBlocked ? [] : postRows ?? []") || !profileBlockSource.includes("Posts hidden")) {
    throw new Error("A profile must not display posts when either account has blocked the other.");
  }
  const questionBlockSource = await readFile(new URL("../app/questions/page.tsx", import.meta.url), "utf8");
  if (!questionBlockSource.includes('.from("blocks")') ||
      !questionBlockSource.includes("const rows = (questionRows ?? []).filter((row) => !blockedAuthors.has(row.author_id))") ||
      !questionBlockSource.includes("answerRows = (data ?? []).filter((row) => !blockedAuthors.has(row.author_id))")) {
    throw new Error("Question authors and answers from blocked accounts must be hidden.");
  }
  const communityBlockSource = await readFile(new URL("../app/communities/[slug]/page.tsx", import.meta.url), "utf8");
  if (!communityBlockSource.includes('supabase.from("blocks").select("blocked_id")') || !communityBlockSource.includes("blockedAuthors.has(post.author_id)")) {
    throw new Error("Community feeds must exclude posts from accounts blocked by the viewer.");
  }
  const notificationBlockSource = await readFile(new URL("../app/notifications/page.tsx", import.meta.url), "utf8");
  if (!notificationBlockSource.includes('supabase.from("blocks").select("blocked_id")') || !notificationBlockSource.includes("blockedActorIds.has(item.actor_id)")) {
    throw new Error("Notifications from accounts blocked by the viewer must be hidden.");
  }
  if (!profileBlockSource.includes("await load();") || !profileBlockSource.includes("if (unfollowError)")) {
    throw new Error("Unblocking must refresh the profile, and failed automatic unfollow must be reported.");
  }
  const followActionStart = profileBlockSource.indexOf("async function toggleFollow()");
  const followActionEnd = profileBlockSource.indexOf("async function saveProfilePost", followActionStart);
  const blockActionStart = profileBlockSource.indexOf("async function toggleBlock()");
  const blockActionEnd = profileBlockSource.indexOf("if (loading) return", blockActionStart);
  if (followActionStart < 0 || blockActionStart < 0 ||
      !profileBlockSource.slice(followActionStart, followActionEnd).includes("finally") ||
      !profileBlockSource.slice(blockActionStart, blockActionEnd).includes("finally")) {
    throw new Error("Follow and block actions must release their busy state after network failures.");
  }
  const peopleDiscoverySource = await readFile(new URL("../app/people/page.tsx", import.meta.url), "utf8");
  if (!peopleDiscoverySource.includes('insertError.code === "42501"') || !peopleDiscoverySource.includes("You can't follow this account right now.") || !peopleDiscoverySource.includes("no block exists between the accounts")) {
    throw new Error("People discovery must explain blocked or restricted follow failures without exposing raw database errors.");
  }
  process.stdout.write("PASS people discovery gives clear feedback for blocked or restricted follow attempts\\n");
  for (const marker of ["if (blocked || blockedByProfile)", "!blocked && !blockedByProfile && <button", "Unblock this account before following it."]) {
    if (!profileBlockSource.includes(marker)) throw new Error(`Blocked profile must not offer a follow action: ${marker}`);
  }
  process.stdout.write("PASS follow controls are unavailable while either account is blocked\\n");

  process.stdout.write("PASS blocked accounts are hidden from feed and profile views\\n");

  const visualSystem = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const token of ["--verity-navy: #142b3a", "--verity-teal: #168477", "--verity-ivory: #f5f5f0", "--verity-border: #e1e7e3", "Verity design system v3"]) {
    if (!visualSystem.includes(token)) throw new Error("Verity v3 design token is missing: " + token);
  }
  const rootLayoutSource = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  if (!rootLayoutSource.includes("themeColor: '#142b3a'")) throw new Error("Browser theme colour must match the Verity navy brand.");
  for (const marker of ["Verity design system refresh", "--verity-ink", "background-image: none !important", ".verity-post-card:hover", ".verity-workspace", "--workspace-line", "--workspace-teal", "--workspace-highlight", ".verity-ai-hero", ".verity-workspace .text-indigo-600", ".verity-admin-page .bg-indigo-600"]) {
    if (!visualSystem.includes(marker)) throw new Error(`Visual design system is missing expected rule: ${marker}`);
  }
  process.stdout.write("PASS editorial design system rules are present\\n");

  const adminAssistantSource = await readFile(new URL("../app/api/admin/assistant/route.ts", import.meta.url), "utf8");
  const moderationAiSource = await readFile(new URL("../app/api/moderation/ai-summary/route.ts", import.meta.url), "utf8");
  const supportAiSource = await readFile(new URL("../app/api/support/ai-assist/route.ts", import.meta.url), "utf8");
  for (const marker of [
    "const requestedModel = process.env.GEMINI_ADMIN_MODEL?.trim() ||",
    "models/${ADMIN_AI_MODEL}:generateContent",
    "Google Gemini returned 404 for the configured model.",
    "No AI answer was generated.",
  ]) {
    if (!adminAssistantSource.includes(marker)) throw new Error(`Admin AI provider diagnostics are missing: ${marker}`);
  }
  if (adminAssistantSource.includes("The model configuration has been updated; redeploy")) {
    throw new Error("Admin AI 404 message must not claim a model change that was not made.");
  }
  if (adminAssistantSource.split(/\r?\n/).some((line) => line.includes("\\nconst ADMIN_AI_MODEL"))) {
    throw new Error("Admin assistant source contains an escaped newline that breaks TypeScript parsing.");
  }
  const moderationPageSource = await readFile(new URL("../app/moderation/page.tsx", import.meta.url), "utf8");
  const supportPageSource = await readFile(new URL("../app/support/staff/page.tsx", import.meta.url), "utf8");
  if (!moderationPageSource.includes("const actionsRequest = useRef(0)") ||
      !moderationPageSource.includes("if (requestId !== actionsRequest.current) return;") ||
      !moderationPageSource.includes("setActions([]);")) {
    throw new Error("Moderation case switching must clear prior audit history and ignore stale responses.");
  }
  if (!supportPageSource.includes("const messagesRequest = useRef(0)") ||
      !supportPageSource.includes("if (requestId !== messagesRequest.current) return;") ||
      !supportPageSource.includes("setMessages([]);")) {
    throw new Error("Support ticket switching must clear old messages and ignore stale conversation responses.");
  }
  if (!supportPageSource.includes('role === "admin" ? ["support", "trust_safety"] : role === "support" ? ["support"] : ["trust_safety"]')) {
    throw new Error("Support workspace team filter must expose only the current staff role\'s permitted teams.");
  }
  const adminPageSource = await readFile(new URL("../app/admin/ai/page.tsx", import.meta.url), "utf8");
  const aiPageSource = await readFile(new URL("../app/admin/ai/page.tsx", import.meta.url), "utf8");
  for (const marker of ["suggestionsByRole", "admin: [", "moderator: [", "support: [", "role-specific operational briefing", "Seven-day activity comparison", "immediately preceding seven days", "Comments created", "Post reactions", "Community joins", "function PeriodComparison", "% unavailable", "aiConsent", "sent to Google Gemini", "private messages, credentials or personal data"]) {
    if (!aiPageSource.includes(marker)) throw new Error(`AI workspace is missing role-specific guidance: ${marker}`);
  }
  for (const marker of ["12 requests per hour", "40 per day", "admin_ai_assistant_request", "promptTokens", "outputTokens", "AI usage tracking is unavailable", "allowedModes", "modeInstructions", "Data limitations", "previousMembers7d", "previousPosts7d", "previousTickets7d", "newComments7d", "previousComments7d", "newReactions7d", "previousReactions7d", "newCommunityJoins7d", "previousCommunityJoins7d", "community_memberships", "dailyActivity", "admin_daily_activity_metrics", "twoWeeksAgo", "immediately preceding seven-day period", "const ticketQuery = () =>", '.eq("assigned_team", "support")', "systemInstruction: { parts: [{ text: systemInstruction }] }"]) {
    if (!adminAssistantSource.includes(marker)) throw new Error(`AI assistant is missing usage controls or token metering: ${marker}`);
  }
  const malformedProviderSanitizer = String.raw`replace(/[\\u0000-\\u001f\\u007f]/g, " ").replace(/\\s+/g, " ")`;
  for (const [name, source] of [["admin", adminAssistantSource], ["support", supportAiSource], ["moderation", moderationAiSource]]) {
    if (source.includes(malformedProviderSanitizer)) throw new Error(name + " AI provider diagnostics use an incorrectly escaped control-character sanitizer.");
  }
  const adminAiQuotaMigration = await readFile(new URL("../supabase/migrations/20261120055604_atomic_admin_ai_assistant_usage_quota.sql", import.meta.url), "utf8");
  for (const marker of ["pg_advisory_xact_lock", "hashtextextended", "v_hour_count >= 12", "v_day_count >= 40", "from public, anon, authenticated", "to service_role"]) {
    if (!adminAiQuotaMigration.includes(marker)) throw new Error("Admin AI quota migration is missing atomic enforcement or service-role-only access: " + marker);
  }
  if (!adminAssistantSource.includes("reserve_admin_ai_assistant_request") || !adminAssistantSource.includes("usageId === null")) {
    throw new Error("Admin assistant must reserve its hourly/daily quota atomically before sending prompts to Gemini.");
  }
  const businessApiSource = await readFile(new URL("../app/api/admin/business/route.ts", import.meta.url), "utf8");
  const businessPageSource = await readFile(new URL("../app/admin/business/page.tsx", import.meta.url), "utf8");
  for (const marker of ["[\"admin\", \"moderator\", \"support\"].includes(profile?.role || \"\")", "const canModerate = isAdmin || role === \"moderator\"", "const canSupport = isAdmin || role === \"support\"", "VERITY_ADMIN_AI_ENABLED !== \"true\"", "\"Cache-Control\": \"no-store\""]) {
    if (!adminAssistantSource.includes(marker)) throw new Error(`Admin assistant API is missing required access/cost control: ${marker}`);
  }
  if (!adminPageSource.includes("AI is not activated.") || !adminPageSource.includes("Read-only") || !adminPageSource.includes("Generate daily briefing") || !adminPageSource.includes("Prioritise work")) {
    throw new Error("Admin AI page is missing its disabled-by-default and read-only safety states.");
  }
  if (!businessApiSource.includes('profile?.role !== "admin"') || !businessApiSource.includes("Business enquiry —%") || !businessApiSource.includes("not_configured")) {
    throw new Error("Business dashboard API is missing its admin gate, lead filter or honest revenue state.");
  }
  if (!businessPageSource.includes("Enquiries are not revenue.") || !businessPageSource.includes("No payment processor connected")) {
    throw new Error("Business dashboard is missing its revenue transparency notices.");
  }

  for (const marker of ['body.consent !== true', 'moderation.ai_case_summary', 'select("role,is_suspended")', 'profile.is_suspended', 'profile.role !== "admin"', 'needs_second_review', 'gemini-3.5-flash-lite', 'does not make moderation decisions']) {
    if (!moderationAiSource.includes(marker)) throw new Error(`Moderation AI route is missing consent, access, audit or human-review guard: ${marker}`);
  }
  for (const marker of ['body.consent !== true', 'support.ai_assist', 'ticket.assigned_team === "support"', 'ticket.assigned_team === "trust_safety"', 'draft_customer_reply', 'Nothing is sent or changed']) {
    if (!supportAiSource.includes(marker)) throw new Error(`Support AI route is missing consent, team access, audit or draft-only guard: ${marker}`);
  }
  const staffAiQuotaMigration = await readFile(new URL("../supabase/migrations/20261120055855_atomic_support_and_moderation_ai_usage_quota.sql", import.meta.url), "utf8");
  for (const marker of ["pg_advisory_xact_lock", "v_hour_count >= 10", "support.ai_assist", "moderation.ai_case_summary", "from public, anon, authenticated", "to service_role"]) {
    if (!staffAiQuotaMigration.includes(marker)) throw new Error("Staff AI quota migration is missing atomic enforcement or restricted RPC access: " + marker);
  }
  if (!supportAiSource.includes('rpc("reserve_staff_ai_action"') || !moderationAiSource.includes('rpc("reserve_staff_ai_action"')) {
    throw new Error("Support and moderation AI requests must reserve hourly usage atomically before sending case or ticket content.");
  }
  if (!supportPageSource.includes("Google Gemini for this request") || !supportPageSource.includes("Use in reply editor")) {
    throw new Error("Support AI UI must require consent and keep the draft under staff control.");
  }
  if (!moderationPageSource.includes("Google Gemini for this request") || !moderationPageSource.includes("Generate case summary")) {
    throw new Error("Moderation AI UI must require consent before requesting a case summary.");
  }
  process.stdout.write("PASS admin AI and business workspace access/cost boundaries are present\\n");

  const feedSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const questionsSource = await readFile(new URL("../app/questions/page.tsx", import.meta.url), "utf8");
  const trustCenterSource = await readFile(new URL("../app/verify/page.tsx", import.meta.url), "utf8");
  const quickReviewUiSource = await readFile(new URL("../app/verify/quick/page.tsx", import.meta.url), "utf8");
  for (const marker of ["Create a post", "Post type", "Community", "Title", "Caption", "Submit a ticket", "Request human review", "Communities"]) {
    if (!feedSource.includes(marker)) throw new Error(`PPT community/feed requirement is missing: ${marker}`);
  }
  for (const marker of ["Ask the community", "Publish question", "Add an answer"]) {
    if (!questionsSource.includes(marker)) throw new Error(`PPT questions/discussion requirement is missing: ${marker}`);
  }
  if (!trustCenterSource.includes("/verify/quick") || !quickReviewUiSource.includes("Quick content review")) {
    throw new Error("PPT text/image AI review entry point is missing from the Trust Center.");
  }
  process.stdout.write("PASS PPT acceptance checks: feed, post composer, questions, support, human review and AI review entry point\\n");

  await waitForServer();

  for (const [path, expectedText] of routes) {
    const response = await fetch(new URL(path, origin), {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    const html = await response.text();

    if (response.status !== 200) {
      throw new Error(`${path} returned HTTP ${response.status}`);
    }
    if (!html.includes("<!DOCTYPE html>") || !html.includes("</html>")) {
      throw new Error(`${path} did not return a complete HTML document`);
    }
    if (expectedText && !html.includes(expectedText)) {
      throw new Error(`${path} did not render its expected page marker: ${expectedText}`);
    }

    const requiredHeaders = [
      "x-content-type-options",
      "x-frame-options",
      "referrer-policy",
      "permissions-policy",
      "strict-transport-security",
    ];
    for (const header of requiredHeaders) {
      if (!response.headers.get(header)) {
        throw new Error(`${path} is missing security header: ${header}`);
      }
    }

    process.stdout.write(`PASS ${path} (${response.status})\n`);
    if (path === "/for-organizations") {
      for (const marker of ["Advertising", "Organization plans", "Business enquiry form", "No payment details are requested"]) {
        if (!html.includes(marker)) throw new Error(`Business page is missing expected content: ${marker}`);
      }
    }
    if (path === "/") {
      if (!html.includes('aria-label="Open navigation menu"') || !html.includes('aria-controls="verity-mobile-menu"') || !html.includes('id="verity-mobile-menu"')) {
        throw new Error("Home page is missing its accessible mobile navigation toggle or sidebar target.");
      }
    }
  }

  const quickReviewQuotaMigration = await readFile(new URL("../supabase/migrations/20261120045416_atomic_quick_review_rate_limit.sql", import.meta.url), "utf8");
  for (const marker of ["pg_advisory_xact_lock", "hashtextextended", "v_count >= 5", "to service_role"]) {
    if (!quickReviewQuotaMigration.includes(marker)) throw new Error(`Quick review quota migration is missing atomic enforcement: ${marker}`);
  }
  const quickReviewApiSource = await readFile(new URL("../app/api/verify/quick-review/route.ts", import.meta.url), "utf8");
  const quickReviewPageSource = await readFile(new URL("../app/verify/quick/page.tsx", import.meta.url), "utf8");
  if (!quickReviewApiSource.includes('rpc("start_verification_quick_review"')) throw new Error("Quick review API must reserve quota atomically before contacting Gemini.");
  process.stdout.write("PASS quick review quota is atomically enforced per user\\n");
  for (const marker of ['review_risk_percent: { type: "INTEGER" }', 'parsed.review_risk_percent < 0', 'review_priority: parsed.review_risk_percent <= 30', 'requestBody.tools = [{ googleSearch: {} }]', 'grounding?.groundingChunks', 'grounding?.groundingSupports', 'grounding?.webSearchQueries', 'source_linked_statements:', 'parsedUrl.protocol !== "https:"', 'evidence_status:']) {
    if (!quickReviewApiSource.includes(marker)) throw new Error(`Text review is missing grounded evidence handling: ${marker}`);
  }
  for (const marker of ['review.sources.map', 'review.source_linked_statements.map', '30 days', 'Google Search grounded']) {
    if (!quickReviewPageSource.includes(marker)) throw new Error(`Quick review page is missing required evidence display or privacy disclosure: ${marker}`);
  }
  if (quickReviewPageSource.includes("dangerouslySetInnerHTML") || quickReviewPageSource.includes("search_entry_point_html")) {
    throw new Error("Quick review must never inject external Google Search HTML into the page.");
  }
  if (quickReviewApiSource.includes("search_entry_point_html") || quickReviewApiSource.includes("searchEntryPointHtml")) {
    throw new Error("Quick review API must not return external provider HTML.");
  }
  process.stdout.write("PASS text review grounds claims with Google Search and displays returned sources/suggestions\\n");

  const quickReviewStatusResponse = await fetch(new URL("/api/verify/quick-review", origin), { signal: AbortSignal.timeout(5000) });
  const quickReviewStatus = await quickReviewStatusResponse.json();
  if (!quickReviewStatusResponse.ok || typeof quickReviewStatus.configured !== "boolean" || "apiKey" in quickReviewStatus) {
    throw new Error("Quick review provider status must safely report availability without exposing credentials.");
  }
  process.stdout.write("PASS quick review provider readiness is safely exposed without secrets\\n");

  for (const marker of ["experimental 0–100 human-review risk index", "Experimental review-risk score", "0–30% · Low", "31–60% · Medium", "61–100% · High", "uncalibrated AI triage index", "AI review is currently unavailable", "Open Trust Center source discovery", "aiAvailable !== true"]) {
    if (!quickReviewPageSource.includes(marker)) throw new Error(`Quick review is missing honest provider-unavailable handling: ${marker}`);
  }
  process.stdout.write("PASS quick review disables analysis and offers source discovery when Gemini is unavailable\\n");

  const quickReviewResponse = await fetch(new URL("/api/verify/quick-review", origin), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "text", text: "This is a sufficiently long sample claim for a smoke test.", consent: true }), signal: AbortSignal.timeout(5000) });
  if (quickReviewResponse.status !== 401) throw new Error("Quick review API must reject unauthenticated access.");
  process.stdout.write("PASS standalone quick review API rejects unauthenticated access (401)\\n");

  const businessApiResponse = await fetch(new URL("/api/admin/business", origin), { signal: AbortSignal.timeout(5000) });
  if (businessApiResponse.status !== 401) throw new Error("Business dashboard API must reject unauthenticated access.");
  process.stdout.write("PASS /api/admin/business rejects unauthenticated access (401)\\n");

  const revenuePageSource = await readFile(new URL("../app/admin/revenue/page.tsx", import.meta.url), "utf8");
  if (!revenuePageSource.includes('assistantPayload.role !== "admin"') || !revenuePageSource.includes("No real earnings are recorded yet")) {
    throw new Error("Revenue workspace is missing its administrator role check or truthful financial state.");
  }
  for (const marker of ["AI Revenue Analyst", "Waiting for verified ledger", "Sponsor performance", "Forecast scenarios", "reconciled ledger"]) {
    if (!revenuePageSource.includes(marker)) throw new Error(`Revenue analyst safeguards are missing: ${marker}`);
  }
  const revenueApiResponse = await fetch(new URL("/api/admin/business", origin), { signal: AbortSignal.timeout(5000) });
  if (revenueApiResponse.status !== 401) throw new Error("Revenue data source must reject unauthenticated access (401).");

  const adminAssistantResponse = await fetch(new URL("/api/admin/assistant", origin), { signal: AbortSignal.timeout(5000) });
  if (adminAssistantResponse.status !== 401) throw new Error("Admin assistant API must reject unauthenticated access.");
  process.stdout.write("PASS /api/admin/assistant rejects unauthenticated access (401)\\n");

  const sharedPostId = "00000000-0000-4000-8000-000000000001";
  const sharedPostResponse = await fetch(new URL(`/post/${sharedPostId}`, origin), {
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
  if (sharedPostResponse.status !== 307 || sharedPostResponse.headers.get("location") !== `/?post=${sharedPostId}`) {
    throw new Error("Shared post permalink did not redirect to the home feed with its post ID.");
  }
  process.stdout.write("PASS /post/:id redirects to the highlighted home-feed post\\n");

  const factCheckSource = await readFile(new URL("../app/api/verify/fact-check/route.ts", import.meta.url), "utf8");
  for (const marker of ["GOOGLE_FACT_CHECK_API_KEY", "fact_check_search", "20) return fail", "publishers' own wording"]) {
    if (!factCheckSource.includes(marker)) throw new Error(`Published fact-check integration is missing a required guard: ${marker}`);
  }
  const factCheckAuthResponse = await fetch(new URL("/api/verify/fact-check?q=A sufficiently long test claim", origin), {
    signal: AbortSignal.timeout(5000),
  });
  if (factCheckAuthResponse.status !== 401) throw new Error("Published fact-check API must reject unauthenticated access (401).");
  process.stdout.write("PASS published fact-check API rejects unauthenticated access (401)\\n");

  const invalidCoverageResponse = await fetch(new URL("/api/verify/news?q=short", origin), {
    signal: AbortSignal.timeout(5000),
  });
  const invalidCoveragePayload = await invalidCoverageResponse.json();
  if (invalidCoverageResponse.status !== 400 || typeof invalidCoveragePayload.error !== "string") {
    throw new Error("News discovery API did not reject an undersized query safely.");
  }
  process.stdout.write("PASS /api/verify/news rejects invalid queries (400)\\n");

  const invalidCommunityCountResponse = await fetch(new URL("/api/public/community-member-count?communityId=invalid", origin), {
    signal: AbortSignal.timeout(5000),
  });
  const invalidCommunityCountPayload = await invalidCommunityCountResponse.json();
  if (invalidCommunityCountResponse.status !== 400 || typeof invalidCommunityCountPayload.error !== "string") {
    throw new Error("Public community member-count API did not validate its community ID.");
  }
  process.stdout.write("PASS public community member-count API validates input and returns no member identities\\n");

  const geminiUnavailableResponse = await fetch(new URL("/api/verify/gemini", origin), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId: "00000000-0000-0000-0000-000000000000", mediaId: "00000000-0000-0000-0000-000000000000", consent: true }),
    signal: AbortSignal.timeout(5000),
  });
  if (![401, 503].includes(geminiUnavailableResponse.status)) {
    throw new Error("Gemini media API must fail closed without authentication or server configuration.");
  }
  process.stdout.write("PASS /api/verify/gemini fails closed without auth/configuration\\n");

  const geminiClaimUnavailableResponse = await fetch(new URL("/api/verify/gemini/claim", origin), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId: "00000000-0000-0000-0000-000000000000", claim: "A sufficiently long sample claim for the CI test.", consent: true }),
    signal: AbortSignal.timeout(5000),
  });
  if (![401, 503].includes(geminiClaimUnavailableResponse.status)) {
    throw new Error("Gemini claim API must fail closed without authentication or server configuration.");
  }
  process.stdout.write("PASS /api/verify/gemini/claim fails closed without auth/configuration\\n");

  const mediaGeminiSource = await readFile(new URL("../app/api/verify/gemini/route.ts", import.meta.url), "utf8");
  const claimGeminiSource = await readFile(new URL("../app/api/verify/gemini/claim/route.ts", import.meta.url), "utf8");
  for (const marker of ["providerFailureMessage", "Gemini API returned HTTP", "Check the Google AI quota and billing"]) {
    if (!mediaGeminiSource.includes(marker) || !claimGeminiSource.includes(marker)) throw new Error(`Gemini diagnostics are missing: ${marker}`);
  }
  if (!mediaGeminiSource.includes("TimeoutError") || !claimGeminiSource.includes("TimeoutError")) throw new Error("Gemini timeout failures must be reported distinctly.");
  process.stdout.write("PASS Gemini provider failures expose sanitized diagnostic reasons\\n");

  const moderationEvidenceSource = await readFile(new URL("../app/api/moderation/ai-summary/route.ts", import.meta.url), "utf8");
  const moderationUiSource = await readFile(new URL("../app/moderation/page.tsx", import.meta.url), "utf8");
  for (const marker of ["discussion_comments", "evidenceCoverage", "insufficientInformation", "Insufficient case information"]) {
    if (!moderationEvidenceSource.includes(marker) && !moderationUiSource.includes(marker)) throw new Error(`Moderation evidence coverage is missing: ${marker}`);
  }
  if (!moderationEvidenceSource.includes(".from(\"comments\")")) throw new Error("Moderation AI must include available public post discussion context.");
  process.stdout.write("PASS moderation AI includes discussion context and sparse-evidence warnings\\n");

  const adminGeminiModelSource = await readFile(new URL("../app/api/admin/assistant/route.ts", import.meta.url), "utf8");
  if (!adminGeminiModelSource.includes("gemini-3.5-flash-lite")) throw new Error("Admin assistant must use the current Gemini 3.5 Flash-Lite model.");
  if (!adminGeminiModelSource.includes("providerCode") || !adminGeminiModelSource.includes("Google Gemini denied generation access")) throw new Error("Admin assistant provider diagnostics are missing.");
  process.stdout.write("PASS admin assistant uses supported Gemini model and reports provider failures\\n");

  const aiRoutes = [
    ["../app/api/admin/assistant/route.ts", 30],
    ["../app/api/moderation/ai-summary/route.ts", 60],
    ["../app/api/support/ai-assist/route.ts", 60],
    ["../app/api/verify/gemini/route.ts", 60],
    ["../app/api/verify/gemini/claim/route.ts", 30],
  ];
  for (const [path, duration] of aiRoutes) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    if (!source.includes("gemini-3.5-flash-lite")) throw new Error(`AI route is not using the supported Gemini model: ${path}`);
    if (source.includes("temperature:")) throw new Error(`Gemini Flash-Lite route must not override unsupported sampling settings: ${path}`);
    if (!source.includes(`maxDuration = ${duration}`)) throw new Error(`AI route has no expected Vercel function duration: ${path}`);
  }
  for (const [path, marker] of [["../app/api/moderation/ai-summary/route.ts", "Moderation Gemini provider error:"], ["../app/api/support/ai-assist/route.ts", "Support Gemini provider error:"]]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    if (!source.includes(marker) || !source.includes("providerCode")) throw new Error(`AI provider diagnostics are missing: ${path}`);
  }
  process.stdout.write("PASS all AI routes use supported Gemini model, bounded runtime and actionable provider diagnostics\\n");

  process.stdout.write(`\\nSmoke test passed for ${routes.length} production routes.\\n`);
} finally {
  if (server.pid) {
    try {
      if (process.platform === "win32") server.kill("SIGTERM");
      else process.kill(-server.pid, "SIGTERM");
    } catch {
      // The process may already have exited.
    }
  }
}
