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
  ["/admin/ai", "AI command center"],
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

  const visualSystem = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const marker of ["Verity design system refresh", "--verity-ink", "background-image: none !important", ".verity-post-card:hover"]) {
    if (!visualSystem.includes(marker)) throw new Error(`Visual design system is missing expected rule: ${marker}`);
  }
  process.stdout.write("PASS editorial design system rules are present\\n");

  const adminAssistantSource = await readFile(new URL("../app/api/admin/assistant/route.ts", import.meta.url), "utf8");
  const adminPageSource = await readFile(new URL("../app/admin/ai/page.tsx", import.meta.url), "utf8");
  for (const marker of ["[\"admin\", \"moderator\", \"support\"].includes(profile?.role || \"\")", "const canModerate = isAdmin || role === \"moderator\"", "const canSupport = isAdmin || role === \"support\"", "VERITY_ADMIN_AI_ENABLED !== \"true\"", "\"Cache-Control\": \"no-store\""]) {
    if (!adminAssistantSource.includes(marker)) throw new Error(`Admin assistant API is missing required access/cost control: ${marker}`);
  }
  if (!adminPageSource.includes("AI is not activated.") || !adminPageSource.includes("Read-only")) {
    throw new Error("Admin AI page is missing its disabled-by-default and read-only safety states.");
  }
  process.stdout.write("PASS admin AI access and cost gates are present\\n");

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

  process.stdout.write(`\nSmoke test passed for ${routes.length} production routes.\n`);
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
