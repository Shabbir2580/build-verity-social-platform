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

  const homePageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
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

  const productPageSources = await Promise.all([
    readFile(new URL("../app/u/[username]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/people/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/questions/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/communities/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/notifications/page.tsx", import.meta.url), "utf8"),
  ]);
  for (const [index, source] of productPageSources.entries()) {
    if (!source.includes("verity-product-page")) {
      throw new Error(`Product page ${index + 1} is missing the shared responsive design shell.`);
    }
  }
  process.stdout.write("PASS profile, people, community and notification pages use the shared product shell\\n");

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
  const supportPageSource = await readFile(new URL("../app/support/staff/page.tsx", import.meta.url), "utf8");
  const moderationPageSource = await readFile(new URL("../app/moderation/page.tsx", import.meta.url), "utf8");
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
  const moderationAiSource = await readFile(new URL("../app/api/moderation/ai-summary/route.ts", import.meta.url), "utf8");
  const supportAiSource = await readFile(new URL("../app/api/support/ai-assist/route.ts", import.meta.url), "utf8");
  for (const marker of ['body.consent !== true', 'moderation.ai_case_summary', 'select("role,is_suspended")', 'profile.is_suspended', 'profile.role !== "admin"', 'needs_second_review', 'gemini-2.5-flash', 'does not make moderation decisions']) {
    if (!moderationAiSource.includes(marker)) throw new Error(`Moderation AI route is missing consent, access, audit or human-review guard: ${marker}`);
  }
  for (const marker of ['body.consent !== true', 'support.ai_assist', 'ticket.assigned_team === "support"', 'ticket.assigned_team === "trust_safety"', 'draft_customer_reply', 'Nothing is sent or changed']) {
    if (!supportAiSource.includes(marker)) throw new Error(`Support AI route is missing consent, team access, audit or draft-only guard: ${marker}`);
  }
  if (!supportPageSource.includes("Google Gemini for this request") || !supportPageSource.includes("Use in reply editor")) {
    throw new Error("Support AI UI must require consent and keep the draft under staff control.");
  }
  if (!moderationPageSource.includes("Google Gemini for this request") || !moderationPageSource.includes("Generate case summary")) {
    throw new Error("Moderation AI UI must require consent before requesting a case summary.");
  }
  process.stdout.write("PASS admin AI and business workspace access/cost boundaries are present\\n");

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
  process.stdout.write("PASS /api/verify/news rejects invalid queries (400)\n");

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

  const adminAssistantSource = await readFile(new URL("../app/api/admin/assistant/route.ts", import.meta.url), "utf8");
  if (!adminAssistantSource.includes("gemini-3.5-flash-lite") || adminAssistantSource.includes("gemini-2.5-flash")) throw new Error("Admin assistant must use the current Gemini 3.5 Flash-Lite model.");
  if (!adminAssistantSource.includes("providerCode") || !adminAssistantSource.includes("Google Gemini denied generation access")) throw new Error("Admin assistant provider diagnostics are missing.");
  process.stdout.write("PASS admin assistant uses supported Gemini model and reports provider failures\\n");

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
