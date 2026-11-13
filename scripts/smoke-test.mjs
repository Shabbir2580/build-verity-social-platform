import { spawn } from "node:child_process";

const port = 3100;
const origin = `http://127.0.0.1:${port}`;
const routes = [
  ["/", "The internet is loud."],
  ["/login", "Good to see you."],
  ["/signup", "Join the conversation."],
  ["/questions", "Questions worth answering."],
  ["/verify", "See the evidence."],
  ["/notifications", "Notifications"],
  ["/privacy", "Information we handle"],
  ["/terms", "Your content"],
  ["/guidelines", "Community guidelines"],
  ["/settings", "Loading settings..."],
  ["/support/staff", null],
  ["/admin", "Checking administrator access"],
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
  }

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
